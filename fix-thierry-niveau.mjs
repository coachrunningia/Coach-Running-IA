/**
 * Correction du plan de Thierry (albertpiro13@yahoo.fr — plan 1778707652579).
 *   1. Niveau "Expert (Performance)" → "Confirmé (Compétition)" dans questionnaireSnapshot.level
 *   2. Régénération de la séance Renforcement S1 via buildRenfoMainSet avec le bon niveau
 *      → passe de 4 tours / repos 1min à 3 tours / repos 1min30, reps réduites.
 *
 * Justification : profil 62 ans, 10km en 52min, VMA 12.8 → "Expert" auto-déclaré
 * incohérent. "Confirmé" reflète mieux le niveau réel et adoucit le renfo.
 *
 * Backup avant modification.
 */
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { buildRenfoMainSet } from '/tmp/renfo-bundle.mjs';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';
const PLAN_ID = '1778707652579';
const OLD_LEVEL = 'Expert (Performance)';
const NEW_LEVEL = 'Confirmé (Compétition)';

// ─── 1. Lecture + backup ───
const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const doc = await r.json();
if (!doc.fields) { console.error('Plan introuvable:', JSON.stringify(doc).slice(0,200)); process.exit(1); }

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const dir = `backup-thierry-niveau-${ts}`;
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/backup.json`, JSON.stringify(doc, null, 2));
console.log(`✓ Backup : ${dir}/backup.json\n`);

// ─── 2. Vérif niveau actuel ───
const ctx = doc.fields.generationContext.mapValue.fields;
const snap = ctx.questionnaireSnapshot.mapValue.fields;
const currentLevel = snap.level?.stringValue;
console.log(`Niveau actuel (questionnaireSnapshot.level): "${currentLevel}"`);
if (currentLevel !== OLD_LEVEL) {
  console.warn(`⚠️  Attendu "${OLD_LEVEL}", trouvé "${currentLevel}". Abandon par sécurité.`);
  process.exit(1);
}

// ─── 3. Modifier le niveau ───
snap.level = { stringValue: NEW_LEVEL };
console.log(`→ Niveau changé : "${OLD_LEVEL}" → "${NEW_LEVEL}"\n`);

// ─── 4. Régénérer le renfo S1 ───
const w1 = doc.fields.weeks.arrayValue.values[0].mapValue.fields;
const sessions = w1.sessions.arrayValue.values;
let renfoUpdated = false;
for (const s of sessions) {
  const sf = s.mapValue.fields;
  if ((sf.type?.stringValue || '').toLowerCase().includes('renfo')) {
    const oldMainSet = sf.mainSet?.stringValue || '';
    console.log(`RENFO AVANT :`);
    console.log(`  ${oldMainSet}\n`);

    const renfo = buildRenfoMainSet({
      weekNumber: 1,
      goal: 'Trail',
      subGoal: undefined,
      trailDistance: 40,
      level: NEW_LEVEL,
      phase: w1.phase?.stringValue || 'fondamental',
      weight: undefined,
      height: undefined,
      injuries: { hasInjury: false },
    });

    sf.title = { stringValue: renfo.title };
    sf.mainSet = { stringValue: renfo.mainSet };
    sf.warmup = { stringValue: renfo.warmup };
    sf.cooldown = { stringValue: renfo.cooldown };
    sf.duration = { stringValue: renfo.duration };
    // garder le même id

    console.log(`RENFO APRÈS :`);
    console.log(`  title: ${renfo.title}`);
    console.log(`  duration: ${renfo.duration}`);
    console.log(`  ${renfo.mainSet}\n`);
    renfoUpdated = true;
  }
}
if (!renfoUpdated) { console.error('🔴 Aucune séance renfo trouvée en S1. Abandon.'); process.exit(1); }

// ─── 5. PATCH (weeks + generationContext) ───
const patchRes = await fetch(
  `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}` +
  `?updateMask.fieldPaths=weeks&updateMask.fieldPaths=generationContext`,
  {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        weeks: doc.fields.weeks,
        generationContext: doc.fields.generationContext,
      }
    }),
  }
);
const patched = await patchRes.json();
if (patched.error) { console.error('🔴 Erreur PATCH:', patched.error); process.exit(1); }

// ─── 6. Vérification ───
const r2 = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const j2 = await r2.json();
const snap2 = j2.fields.generationContext.mapValue.fields.questionnaireSnapshot.mapValue.fields;
const renfo2 = j2.fields.weeks.arrayValue.values[0].mapValue.fields.sessions.arrayValue.values
  .find(s => (s.mapValue.fields.type?.stringValue||'').toLowerCase().includes('renfo'));
console.log(`--- VÉRIFICATION POST-PATCH ---`);
console.log(`niveau: ${snap2.level?.stringValue}`);
console.log(`renfo mainSet: ${renfo2?.mapValue.fields.mainSet?.stringValue?.substring(0,80)}...`);
console.log(`\n✅ Plan de Thierry corrigé. Backup dans ${dir}/`);
