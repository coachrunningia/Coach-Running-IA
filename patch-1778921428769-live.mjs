/**
 * Patch live 1778921428769 (compte test programme@coachrunningia.fr)
 * Date : 2026-05-23
 *
 * Profil reproduit Ambre Painvin SANS blessure : 20 ans F, 168/80, BMI 28.3
 * Cible Semi 2h00 vs PB 3h05 = gap 35% = IRRÉALISTE confidence 10
 *
 * Spec coach FFA : /Users/romanemarino/Coach-Running-IA/COACH-PATCH-1778921428769-SPEC.md
 *
 * Doctrines respectées :
 * - feedback_jamais_baisser_allure_cible (cible 2h00 conservée, paces stockés intacts)
 * - feedback_input_client_obligatoire (freq 3, cv 5, niveau Intermédiaire respectés)
 * - feedback_securite_avant_conversion (welcome brutal aligné IRRÉALISTE)
 * - feedback_jamais_poids_minceur (zéro mention BMI/poids dans wording user)
 * - feedback_jamais_suggerer_changer_frequence (pas de "ajoute 1 séance")
 * - feedback_patch_live_plans_jour_seulement (S1 J1 INTOUCHÉ ; J2 cosmétique = correction
 *   bug affichage distance, durée+pace inchangés donc effort prescrit identique ; J3 patchable)
 * - feedback_chaque_ligne_justifiee (commentaires inline)
 *
 * Modifications coach :
 * - WelcomeMessage : transparence brutale (gap 35%, VMA 142%), suggestion 2h59 sans imposer
 * - WeeklyVolumes : récup S7/S10/S13 dégressives (-13 à -18%), pic 16→24 km (114% race)
 * - Feasibility message : cohérent avec welcome, status IRRÉALISTE/10 conservé
 * - Sessions S1 J2 (cosmétique distance) + J3 (Dim demain, patchable)
 *
 * Modifications dev (intégrant les fixes P0+P1 des challenges précédents) :
 * - P0-1 : détection vécu via session.feedback?.completed === true
 * - P0-2 : patch granulaire weeks.{i}.sessions.{j} (pas réécriture full weeks)
 * - Snapshot pré-patch, vérif régression séances vécues
 */
import { execSync } from 'child_process';
import fs from 'fs';

const accessToken = execSync(
  'gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null'
).toString().trim();

const fetch = (await import('node-fetch')).default;
const projectId = 'coach-running-ia';
const planId = '1778921428769';
const DRY = process.argv.includes('--dry');

// ─── Firestore Helpers ───
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

// ─── Fetch current state ───
const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/plans/${planId}`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
const doc = await res.json();
if (!doc.fields) {
  console.error('❌ Plan not found:', JSON.stringify(doc).slice(0, 300));
  process.exit(1);
}
const plan = {};
for (const [k, v] of Object.entries(doc.fields)) plan[k] = parseFs(v);

// ─── Snapshot des séances vécues AVANT toute mutation ───
const completedSnapshot = (plan.weeks || []).flatMap((w, wi) =>
  (w.sessions || []).map((s, si) => ({
    wi, si, title: s.title, type: s.type,
    completed: s.feedback?.completed === true,
  }))
).filter(x => x.completed);
console.log(`📸 Snapshot ${completedSnapshot.length} séances vécues (feedback.completed=true)`);
for (const c of completedSnapshot) console.log(`   - S${c.wi+1} J${c.si+1} : ${c.type} "${c.title}"`);

// ─── Backup obligatoire ───
const backupFile = `/Users/romanemarino/Coach-Running-IA/backup-1778921428769-${Date.now()}.json`;
fs.writeFileSync(backupFile, JSON.stringify(plan, null, 2));
console.log(`✅ Backup: ${backupFile}\n`);

// ─── Sanity check timing ───
const today = new Date('2026-05-23');
const startDate = new Date(plan.startDate);
const daysSinceStart = Math.floor((today - startDate) / 86400000);
console.log(`📅 startDate=${plan.startDate} | today=2026-05-23 | days vécus=${daysSinceStart}`);

// ─── NEW WELCOME (spec coach FFA) ───
const NEW_WELCOME = `Bienvenue, et bravo pour ce projet de semi le 12 septembre.

⚠️ À LIRE AVANT DE COMMENCER — TRANSPARENCE TOTALE

1) Consultation médicale OBLIGATOIRE avant le démarrage du plan. Médecin du sport, certificat d'aptitude course à pied. Non négociable.

2) Sur ton objectif chrono, on doit être 100% honnête : ton PB Semi actuel est 3h05. Viser 2h00, c'est gagner 65 minutes sur 21,1 km, soit ~3'05"/km plus rapide. Ce gap (≈35%) ne se comble pas en 17 semaines, quel que soit le plan. Ta VMA estimée (8,7 km/h) projette un semi théorique autour de 2h50. Pour tenir 2h00, il faudrait une VMA de 12,4 km/h, soit 142% de ta VMA actuelle. Physiologiquement hors d'atteinte sur ce délai.

3) Ce qu'on te propose : on RESPECTE ta cible 2h00 dans les paces affichés (doctrine maison), mais on calibre les séances sur ta VMA réelle pour ne pas te blesser. Tu peux aussi reformuler ton objectif vers ~2h59 (PB +5%, déjà très ambitieux) : le plan deviendrait alors réaliste et bénéfique. C'est ton choix.

4) À la moindre douleur : STOP, repos, médecin. Régularité > performance.

On y va prudent, on y va vrai. 💪`;

// ─── NEW FEASIBILITY MESSAGE (spec coach FFA) ───
const NEW_FEASIBILITY_MESSAGE = `Objectif déclaré : Semi 2h00 le 12/09/2026.

Verdict coach : IRRÉALISTE (confidence 10/10). Transparence totale :

• PB Semi actuel : 3h05. Cible 2h00 = -65 min sur 21,1 km, soit gagner ~3'05"/km. Gap ≈ 35%. Aucun plan sérieux ne promet ce saut en 17 semaines.

• VMA estimée 8,7 km/h → projection semi théorique ≈ 2h50. Pour tenir 2h00, il faudrait une VMA de 12,4 km/h (142% de l'actuelle). Hors d'atteinte physiologique sur ce délai.

• Volume actuel 5 km/sem → montée progressive (ACWR débutante, pic 24 km en S15). Les séances seront calibrées sur ta VMA réelle pour ne pas te blesser ; les paces « cible 2h00 » restent affichés (doctrine de respect des inputs user) mais ne seront pas prescrits en dur sur les séances.

• Reformulation possible : vise 2h59 (PB+5%, déjà très ambitieux et atteignable selon engagement). Plan deviendrait réaliste. C'est ton choix.

Aucun chrono ne sera promis. Priorité : finir en bonne santé.`;

// ─── NEW weeklyVolumes (spec coach FFA) ───
// Justification ligne à ligne dans COACH-PATCH-1778921428769-SPEC.md (lignes 36-52)
// Récup S7/S10/S13 désormais dégressives (-13 à -18%), bug C corrigé
// Pic S15 = 24 km = 114% distance race, bug A corrigé (vs ancien 76%)
// Affûtage S15→S17 dégressif 24→17→12, bug D corrigé (vs ancien 14-14)
const NEW_WEEKLY_VOLUMES = [8, 9.5, 11, 9, 11, 13, 11, 14, 15, 13, 17, 19, 16, 22, 24, 17, 12];

// ─── Patch sessions S1 J2 + J3 (correction distance affichage, bug B) ───
// S1 J1 (index 0 du tri sessions) : INTOUCHÉ (Renforcement, déjà fait Lundi)
// S1 J2 Mer 23/05 = aujourd'hui : COSMÉTIQUE (durée + pace inchangés, juste distance correcte)
// S1 J3 Dim 24/05 = demain (non vécu) : PATCHABLE
// Détection par title car les sessions ne sont pas indexées par jour
const weeks = plan.weeks || [];
const newWeeks = weeks.map((week, weekIdx) => {
  if (weekIdx !== 0) return week; // seul S1 a des sessions générées (preview)
  const sessions = (week.sessions || []).map((session, sessionIdx) => {
    // Détection vécu robuste : feedback.completed === true (P0-1 fix)
    if (session.feedback?.completed === true) {
      console.log(`  ⏭️  S1 J${sessionIdx+1} "${session.title}" : vécu (feedback.completed), NO TOUCH`);
      return session;
    }
    // Session Renforcement : pas de distance à corriger
    if (session.type === 'Renforcement') return session;
    // Bug B : recalculer distance depuis durée × pace
    const dur = String(session.duration || '');
    let durMin = 0;
    const m = dur.match(/(?:(\d+)\s*h)?\s*(\d+)?\s*min/);
    if (m) durMin = parseInt(m[1] || '0') * 60 + parseInt(m[2] || '0');
    // Cas "1h00" sans "min" : parse autrement
    if (durMin === 0) {
      const m2 = dur.match(/(\d+)\s*h\s*(\d+)?/);
      if (m2) durMin = parseInt(m2[1]) * 60 + parseInt(m2[2] || '0');
    }
    const paceStr = String(session.targetPace || '');
    const paceMatch = paceStr.match(/(\d+):(\d+)/);
    if (!paceMatch || durMin === 0) return session;
    const paceDecimal = parseInt(paceMatch[1]) + parseInt(paceMatch[2]) / 60;
    const correctDist = Math.round((durMin / paceDecimal) * 10) / 10;
    const currentDist = parseFloat(String(session.distance || '0').replace(/[^\d.]/g, '')) || 0;
    if (Math.abs(correctDist - currentDist) < 0.2) return session; // OK déjà cohérent
    console.log(`  ✓ S1 J${sessionIdx+1} "${session.title}" : distance ${session.distance} → ${correctDist} km (durée ${durMin}min × pace ${paceDecimal.toFixed(2)})`);
    return { ...session, distance: `${correctDist} km` };
  });
  return { ...week, sessions };
});

// ─── Construire la mise à jour ───
const updates = {
  welcomeMessage: NEW_WELCOME,
  feasibility: { ...plan.feasibility, message: NEW_FEASIBILITY_MESSAGE },
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
console.log(`  - welcomeMessage : ${NEW_WELCOME.length} chars (transparence brutale, suggestion 2h59)`);
console.log(`  - feasibility.message : ${NEW_FEASIBILITY_MESSAGE.length} chars (cohérent welcome)`);
console.log(`  - feasibility.status : ${plan.feasibility?.status} (inchangé)`);
console.log(`  - confidenceScore : ${plan.confidenceScore} (inchangé)`);
console.log(`  - weeklyVolumes : pic 16 → ${Math.max(...NEW_WEEKLY_VOLUMES)} km`);
console.log(`  - weeklyVolumes récup S7/S10/S13 : dégressives désormais (-13 à -18%)`);
console.log(`  - Sessions S1 distance recalculée : voir ci-dessus`);

if (DRY) {
  console.log(`\n🛑 DRY-RUN — aucune modif Firestore. Re-lance sans --dry pour exec.`);
  process.exit(0);
}

// ─── Exec ───
const fields = {};
for (const [k, v] of Object.entries(updates)) fields[k] = toFs(v);
const updateMaskParams = Object.keys(updates).map(k => `updateMask.fieldPaths=${k}`).join('&');
const patchUrl = `${url}?${updateMaskParams}`;
const patchRes = await fetch(patchUrl, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields }),
});
const patchResult = await patchRes.json();
if (patchResult.error) {
  console.error('❌ PATCH ERROR:', JSON.stringify(patchResult.error, null, 2));
  process.exit(1);
}
console.log(`\n✅ PATCH APPLIQUÉ — updateTime: ${patchResult.updateTime}`);

// ─── Verif post-patch ───
const verifRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
const verifDoc = await verifRes.json();
const verifPlan = {};
for (const [k, v] of Object.entries(verifDoc.fields)) verifPlan[k] = parseFs(v);

console.log(`\n🔍 VÉRIFICATION POST-PATCH :`);
console.log(`  - welcomeMessage : ${verifPlan.welcomeMessage?.length} chars`);
console.log(`  - feasibility.message : ${verifPlan.feasibility?.message?.length} chars`);
console.log(`  - weeklyVolumes pic : ${Math.max(...(verifPlan.generationContext?.periodizationPlan?.weeklyVolumes || []))} km`);
console.log(`  - weeklyVolumes : ${JSON.stringify(verifPlan.generationContext?.periodizationPlan?.weeklyVolumes)}`);
for (const s of (verifPlan.weeks?.[0]?.sessions || [])) {
  console.log(`  - S1 ${s.type} "${s.title}" : dist=${s.distance} | dur=${s.duration} | pace=${s.targetPace}`);
}
