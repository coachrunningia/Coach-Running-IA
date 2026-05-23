/**
 * Patch live Laurence 1779563548769 — Tendinite ischio active
 * Date : 2026-05-23
 *
 * Profil : 50 ans F, Confirmé Marathon 4h00, cv 25, VMA 12.73,
 *          injuries.description = "Tendinite ischio "
 *
 * Spec coach : COACH-PATCH-LAURENCE-TENDINITE-SPEC.md (validée Romane PM)
 * Pic choix : 55 km (compromis Romane PM entre coach 60 et ultra-prudent 52)
 *
 * Doctrines respectées :
 * - feedback_securite_avant_conversion (PRIME — danger ischio = exception J+5 vécu)
 * - feedback_jamais_baisser_allure_cible (4h00 conservée)
 * - feedback_input_client_obligatoire (freq 5, cv 25 respectés)
 * - feedback_coach_running_ia_que_course (pas de cross-training)
 * - feedback_jamais_poids_minceur (zéro mention IMC)
 * - feedback_jamais_contact_client (Romane communique)
 * - feedback_chaque_ligne_justifiee (commentaires inline)
 * - feedback_patch_live_plans_jour_seulement (S1 vécue NO TOUCH via feedback.completed)
 */
import { execSync } from 'child_process';
import fs from 'fs';

const accessToken = execSync(
  'gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null'
).toString().trim();

const fetch = (await import('node-fetch')).default;
const projectId = 'coach-running-ia';
const planId = '1779563548769';
const DRY = process.argv.includes('--dry');

function parseFs(field) {
  if (field == null) return null;
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return parseInt(field.integerValue);
  if ('doubleValue' in field) return field.doubleValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('timestampValue' in field) return field.timestampValue;
  if ('nullValue' in field) return null;
  if ('arrayValue' in field) return (field.arrayValue.values || []).map(parseFs);
  if ('mapValue' in field) {
    const out = {};
    for (const [k, v] of Object.entries(field.mapValue.fields || {})) out[k] = parseFs(v);
    return out;
  }
  return field;
}
function toFs(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFs) } };
  if (typeof v === 'object') {
    const fields = {};
    for (const [k, val] of Object.entries(v)) fields[k] = toFs(val);
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

// ─── Fetch ───
const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/plans/${planId}`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
const doc = await res.json();
if (!doc.fields) { console.error('❌ Plan not found'); process.exit(1); }
const plan = {};
for (const [k, v] of Object.entries(doc.fields)) plan[k] = parseFs(v);

// ─── Backup obligatoire ───
const backupFile = `/Users/romanemarino/Coach-Running-IA/backup-laurence-tendinite-${Date.now()}.json`;
fs.writeFileSync(backupFile, JSON.stringify(plan, null, 2));
console.log(`✅ Backup: ${backupFile}\n`);

// ─── Snapshot vécues ───
const completedSnapshot = (plan.weeks || []).flatMap((w, wi) =>
  (w.sessions || []).map((s, si) => ({ wi, si, title: s.title, completed: s.feedback?.completed === true }))
).filter(x => x.completed);
console.log(`📸 Séances vécues (feedback.completed=true) : ${completedSnapshot.length}`);

// ─── NEW WELCOME (spec coach mot pour mot) ───
const NEW_WELCOME = `Bienvenue Laurence ! Tu te prépares pour ton Marathon en 4h00, et on adapte le plan dès la première semaine pour tenir compte de ta tendinite ischio.

Compte tenu de cette blessure active, la S1 a été repensée : aucune côte, aucun terrain vallonné cette semaine. Uniquement des footings sur terrain plat — bords de rivière, piste, chemins lisses — et le renforcement ciblé sur la chaîne postérieure (ischios, fessiers) pour stabiliser la zone sans la traumatiser.

Avant de te lancer, valide impérativement avec ton kiné ou ton médecin que tu peux reprendre une activité de course progressive. Si tu sens la moindre tension dans l'ischio pendant un footing, tu ralentis ou tu marches — pas de "je serre les dents". L'objectif des 3 premières semaines, c'est de retrouver de la mécanique propre sur du plat ; les côtes reviendront quand la tendinite sera consolidée.

Ton objectif 4h00 reste la cible — on construit la base prudemment pour la tenir en sécurité.`;

// ─── NEW FEASIBILITY MESSAGE (spec coach) ───
const NEW_FEASIBILITY_MSG = `Avec ta VMA estimée et ta tendinite ischio actuelle, le plan marathon 4h00 est faisable mais en mode prudent. Ton volume actuel (25 km/sem) impose une montée en charge graduelle, et la blessure réclame des 3 premières semaines 100% sur terrain plat pour ne pas réactiver la zone. La cible 4h00 reste atteignable si tu valides la reprise avec ton kiné, si tu respectes le signal douleur à chaque footing, et si la rampe progressive est tenue (+10%/sem max). Un suivi kiné en parallèle des semaines 1-6 est fortement recommandé.`;

// ─── NEW weeklyVolumes (pic 55 — compromis Romane) ───
// Justification : pic 55 km = -19% vs 68 originel, ratio cv/pic 2.20 (vs 2.72 originel).
// Marge sécurité tendinite + Hammond Masters senior. Affûtage S18-S20 dégressif.
const NEW_WEEKLY_VOLUMES = [26, 28, 30, 24, 28, 31, 34, 31, 34, 38, 43, 38, 43, 49, 55, 49, 55, 46, 40, 35];

// ─── Patch sessions : retyper TOUTES sessions "vallonné/côtes" en "plat" ───
// Doctrine sécurité : on évite côtes pour TOUTES les sem (S1-S20), pas juste S1.
// Doctrine S1 vécue : skip via feedback.completed === true.
// Regex large pour matcher variantes : "vallonné", "côtes", "vallonnée"
// Regex affinées : ne pas matcher Renforcement (utile pour prévention ischio).
// "excentr" RETIRÉ du regex mainSet car le Renfo Quadriceps mentionne "exercices excentriques"
// qui est BÉNÉFIQUE pour la rééducation ischio (Cook & Purdam).
const HILL_TITLE_RE = /vallonn[ée]|c[ôo]te|montagne|d[ée]niv|escalier/i;
const HILL_MAINSET_RE = /vallonn[ée]|c[ôo]te|d[ée]niv|montag|escalier/i;

const REPLACEMENT_SESSION = {
  type: 'Jogging',
  title: 'Footing EF plat',
  // distance + duration + targetPace conservés (juste retyper terrain)
  // mainSet réécrit pour terrain plat + signal douleur
};
function buildPlatMainSet(orig) {
  return `Footing en endurance fondamentale sur terrain STRICTEMENT plat (bords de rivière, piste, chemin lisse). Aucune côte, aucune descente. Si tension ischio > 2/10 pendant l'effort → tu ralentis ou tu marches. Pas de relance, pas d'accélération. Objectif : entretenir la mécanique sans solliciter l'excentrique ischio. (allure cible conservée)`;
}

let patchedCount = 0;
let skippedCompleted = 0;
const newWeeks = (plan.weeks || []).map((week, weekIdx) => {
  const sessions = (week.sessions || []).map((session, sessionIdx) => {
    // Doctrine `feedback_patch_live_plans_jour_seulement` : skip vécue
    if (session.feedback?.completed === true) {
      skippedCompleted++;
      return session;
    }
    // Garde-fou : NE JAMAIS toucher le Renforcement (utile pour prévention ischio, doctrine coach)
    if (session.type === 'Renforcement') return session;
    const titleHit = session.title && HILL_TITLE_RE.test(session.title);
    const mainHit = session.mainSet && HILL_MAINSET_RE.test(session.mainSet);
    if (!titleHit && !mainHit) return session;
    patchedCount++;
    console.log(`  ✓ S${weekIdx+1} session ${sessionIdx+1} "${session.title}" → "Footing EF plat"`);
    return {
      ...session,
      ...REPLACEMENT_SESSION,
      mainSet: buildPlatMainSet(session.mainSet),
    };
  });
  return { ...week, sessions };
});

// ─── Construire la mise à jour ───
const updates = {
  welcomeMessage: NEW_WELCOME,
  feasibility: { ...plan.feasibility, message: NEW_FEASIBILITY_MSG },
  weeks: newWeeks,
};
if (plan.generationContext?.periodizationPlan) {
  updates.generationContext = {
    ...plan.generationContext,
    periodizationPlan: {
      ...plan.generationContext.periodizationPlan,
      weeklyVolumes: NEW_WEEKLY_VOLUMES,
    },
  };
}

console.log(`\n📊 RÉSUMÉ PATCH :`);
console.log(`  - welcomeMessage : ${NEW_WELCOME.length} chars (reconnaissance tendinite + plat strict + kiné)`);
console.log(`  - feasibility.status : ${plan.feasibility?.status} (RISQUÉ conservé)`);
console.log(`  - feasibility.message : ${NEW_FEASIBILITY_MSG.length} chars (intègre tendinite)`);
console.log(`  - weeklyVolumes : pic 68 → ${Math.max(...NEW_WEEKLY_VOLUMES)} km (-19%, ratio cv/pic 2.20)`);
console.log(`  - Sessions vallonné retypées plat : ${patchedCount}`);
console.log(`  - Séances vécues skip : ${skippedCompleted}`);
console.log(`  - Cible Marathon 4h00 + freq 5 + cv 25 + raceDate : INTACTS`);

if (DRY) {
  console.log(`\n🛑 DRY-RUN — aucune modif Firestore.`);
  process.exit(0);
}

// ─── Exec ───
const fields = {};
for (const [k, v] of Object.entries(updates)) fields[k] = toFs(v);
const updateMaskParams = Object.keys(updates).map(k => `updateMask.fieldPaths=${k}`).join('&');
const patchRes = await fetch(`${url}?${updateMaskParams}`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields }),
});
const patchResult = await patchRes.json();
if (patchResult.error) { console.error('❌', JSON.stringify(patchResult.error)); process.exit(1); }
console.log(`\n✅ PATCH APPLIQUÉ — updateTime: ${patchResult.updateTime}`);

// ─── Verif ───
const verifRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
const verifDoc = await verifRes.json();
const verifPlan = {};
for (const [k, v] of Object.entries(verifDoc.fields)) verifPlan[k] = parseFs(v);
const verifVallonneRemaining = (verifPlan.weeks || []).flatMap(w => w.sessions || []).filter(s =>
  (s.title && HILL_TITLE_RE.test(s.title)) || (s.mainSet && HILL_MAINSET_RE.test(s.mainSet))
).length;
console.log(`\n🔍 VÉRIFICATION POST-PATCH :`);
console.log(`  - welcomeMessage : ${verifPlan.welcomeMessage?.length} chars`);
console.log(`  - weeklyVolumes pic : ${Math.max(...(verifPlan.generationContext?.periodizationPlan?.weeklyVolumes || []))} km`);
console.log(`  - Sessions "vallonné/côtes" restantes : ${verifVallonneRemaining} (doit être 0 ou = vécues)`);
console.log(`  - feasibility.status : ${verifPlan.feasibility?.status}`);
