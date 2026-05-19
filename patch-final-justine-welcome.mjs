/**
 * PATCH FINAL — Justine welcomeMessage cite la blessure — 18/05/2026
 * ────────────────────────────────────────────────────────────────────────────
 * Plan : 1779124016788 (justine.clt29@icloud.com, UID oGi1YkRbNCSQfTucLkd9yxs6sfb2)
 *
 * Bug : welcomeMessage actuel ne cite pas la blessure déclarée
 *       (algodystrophie cheville droite). La règle A4 (commit 40b436a) protège
 *       les plans futurs ; celui-ci a été créé avant.
 *
 * Source blessure (user) : questionnaireData.injuries.description =
 *       "Algodystrophie cheville droite "
 *       hasInjury = true (donc considérée active/non explicitement guérie)
 *
 * Réécriture A4 — 3 piliers :
 *   - RECONNAÎTRE : citer "algodystrophie cheville droite" (mots du user)
 *   - ADAPTER    : progression douce, surface souple, renfo ciblé cheville,
 *                  pas de descente technique
 *   - RECOMMANDER : reco médicale FORTE (algodystrophie = pathologie sérieuse,
 *                   validation kiné/médecin avant reprise course)
 *
 * Garde-fous wording :
 *   - 2-3 phrases fluides intégrées, pas de liste numérotée visible
 *   - jamais "ta blessure t'empêche de…"
 *   - factuel centré plan
 *   - aucun mot interdit (poids/IMC/minceur/silhouette)
 *   - parties existantes du welcome (plan, niveau, certificat) préservées
 *
 * Touche UNIQUEMENT welcomeMessage. Backup systématique. Re-read confirmation.
 *
 * Usage : node patch-final-justine-welcome.mjs --apply
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';

const APPLY = process.argv.includes('--apply');
if (!APPLY) { console.error('🔴 --apply requis.'); process.exit(1); }

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { encoding: 'utf-8' }).trim();
const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'x-goog-user-project': PROJECT };

const PLAN_ID = '1779124016788';
const BACKUP_DIR = '/Users/romanemarino/Coach-Running-IA/backup-final';
mkdirSync(BACKUP_DIR, { recursive: true });

async function readPlan() {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
  const r = await fetch(url, { headers: H });
  const j = await r.json();
  if (j.error) throw new Error('READ → ' + j.error.message);
  return j;
}

async function patchWelcome(newWelcome) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
  const qs = 'updateMask.fieldPaths=welcomeMessage';
  const body = { fields: { welcomeMessage: { stringValue: newWelcome } } };
  const r = await fetch(`${url}?${qs}`, { method: 'PATCH', headers: H, body: JSON.stringify(body) });
  const j = await r.json();
  if (j.error) throw new Error('PATCH → ' + j.error.message);
  return j;
}

// ── Nouveau welcomeMessage (3 piliers A4) ───────────────────────────────────
// Préserve :
//   - paragraphe 1 (bienvenue/objectif/niveau) tel quel
//   - paragraphe final (certificat médical) tel quel
// Ajoute UN paragraphe central qui cite la blessure (3 piliers fluides).
const WELCOME_NEW = [
  "Bienvenue dans ton programme de remise en forme de 12 semaines ! L'objectif est de t'accompagner vers une meilleure condition physique et de maintenir le plaisir de courir, en toute sécurité. Ce plan est structuré pour s'adapter à ton niveau débutant, en se concentrant sur la régularité et une progression douce.",
  "Tu nous as indiqué une algodystrophie à la cheville droite : le plan en tient compte avec une progression très progressive du volume, des séances privilégiant les surfaces souples (chemin, herbe), un renforcement ciblé cheville/mollet pour stabiliser l'articulation, et zéro descente technique sur les premières semaines. Comme l'algodystrophie est une pathologie qui demande un suivi spécifique, valide impérativement avec ton médecin ou ton kiné que tu peux reprendre une activité de course progressive avant de démarrer, et au moindre signe de douleur ou de gêne pendant le plan, lève le pied et reconsulte.",
  "Nous te recommandons vivement de consulter un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport.",
].join('\n\n');

// ── Garde-fous wording ──────────────────────────────────────────────────────
const FORBIDDEN = ['poids', 'imc', 'minceur', 'silhouette', 'maigrir', 'perdre du poids', 'kilos', 'corpulence'];
const REQUIRED  = ['algodystrophie', 'cheville']; // mots du user
const ANTI_PATTERNS = [/t'empêche de/i, /ne peux plus/i, /tu es limitée/i];

function checkWording(text) {
  const issues = [];
  const lower = text.toLowerCase();
  for (const w of FORBIDDEN) if (lower.includes(w)) issues.push(`mot interdit : "${w}"`);
  for (const w of REQUIRED) if (!lower.includes(w)) issues.push(`mot requis absent : "${w}"`);
  for (const p of ANTI_PATTERNS) if (p.test(text)) issues.push(`anti-pattern : ${p}`);
  // pas de liste numérotée visible
  if (/^\s*\d+\.\s+/m.test(text)) issues.push('liste numérotée détectée');
  return issues;
}

console.log('='.repeat(80));
console.log('PATCH FINAL — Justine welcomeMessage — plan ' + PLAN_ID);
console.log('='.repeat(80));

const before = await readPlan();
const backupPath = `${BACKUP_DIR}/justine-pre-welcome.json`;
writeFileSync(backupPath, JSON.stringify(before, null, 2));
console.log('  📦 backup →', backupPath);

const welcomeBefore = before.fields?.welcomeMessage?.stringValue || '';
console.log('\n  --- WELCOME AVANT (' + welcomeBefore.length + ' chars) ---');
console.log(welcomeBefore);
console.log('\n  --- WELCOME APRÈS (' + WELCOME_NEW.length + ' chars) ---');
console.log(WELCOME_NEW);

// Idempotence : si la blessure est déjà citée, skip
if (/algodystrophie/i.test(welcomeBefore)) {
  console.log('\n  ✅ Idempotent : welcome cite déjà "algodystrophie". Aucun PATCH.');
  process.exit(0);
}

// Vérifs wording
const issues = checkWording(WELCOME_NEW);
console.log('\n  CHECK wording :', issues.length === 0 ? '✅' : '🔴', issues);
if (issues.length > 0) { console.error('🔴 wording KO.'); process.exit(1); }

// Préservation parties existantes : 1er paragraphe et dernier paragraphe intégraux
const p1 = welcomeBefore.split('\n\n')[0];
const pLast = welcomeBefore.split('\n\n').pop();
const p1Ok = WELCOME_NEW.includes(p1);
const pLastOk = WELCOME_NEW.includes(pLast);
console.log('  CHECK paragraphe 1 préservé      :', p1Ok ? '✅' : '🔴');
console.log('  CHECK paragraphe certificat préservé :', pLastOk ? '✅' : '🔴');
if (!p1Ok || !pLastOk) { console.error('🔴 paragraphes existants non préservés.'); process.exit(1); }

await patchWelcome(WELCOME_NEW);
console.log('\n  ✔ PATCH envoyé.');

const after = await readPlan();
const welcomeReread = after.fields?.welcomeMessage?.stringValue || '';
console.log('\n  --- RE-READ (' + welcomeReread.length + ' chars) ---');
console.log(welcomeReread);

const rereadOk = welcomeReread === WELCOME_NEW;
console.log('\n  re-read identique :', rereadOk ? '✅' : '🔴');

// Voisins préservés
const topKeysBefore = Object.keys(before.fields).sort();
const topKeysAfter = Object.keys(after.fields).sort();
const keysOk = JSON.stringify(topKeysBefore) === JSON.stringify(topKeysAfter);
console.log('  top-level keys préservées :', keysOk ? '✅' : '🔴');

const weeksBefore = (before.fields?.weeks?.arrayValue?.values || []).length;
const weeksAfter = (after.fields?.weeks?.arrayValue?.values || []).length;
console.log('  weeks length préservée :', weeksBefore === weeksAfter ? '✅' : '🔴', weeksBefore, '→', weeksAfter);

process.exit(rereadOk && keysOk ? 0 : 1);
