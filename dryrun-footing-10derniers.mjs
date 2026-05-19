/**
 * DRY-RUN (aucune écriture) — variantes de footing sur la S1 des 10 derniers
 * plans générés. Montre AVANT / APRÈS pour chaque séance Jogging.
 * Utilise le bundle footingVariants à jour (avec les 2 fixes).
 */
import { execSync } from 'child_process';
import { buildFootingVariant, detectFootingFlags } from '/tmp/footing-bundle.mjs';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';

function pv(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.arrayValue) return (v.arrayValue.values || []).map(pv);
  if (v.mapValue) return pf(v.mapValue.fields);
  return null;
}
function pf(fields) { if (!fields) return {}; const o = {}; for (const [k, v] of Object.entries(fields)) o[k] = pv(v); return o; }

// 10 derniers plans créés
const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
  method: 'POST', headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    structuredQuery: {
      from: [{ collectionId: 'plans' }],
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: 10,
    }
  }),
});
const data = await r.json();
const plans = (Array.isArray(data) ? data : []).filter(x => x.document)
  .map(x => ({ id: x.document.name.split('/').pop(), ...pf(x.document.fields) }));

console.log(`${plans.length} derniers plans récupérés.\n`);

let totalModifiable = 0;
let totalSkipped = 0;

for (const p of plans) {
  const ctx = p.generationContext || {};
  const profile = { ...(ctx.questionnaireSnapshot || {}), ...(ctx.questionnaireData || {}) };
  const flags = detectFootingFlags({
    weight: profile.weight, height: profile.height, age: profile.age,
    level: profile.level, injuries: profile.injuries,
  });
  const efPace = p.paces?.efPace || '';
  const w1 = p.weeks?.[0];
  const phaseLc = (w1?.phase || 'fondamental').toLowerCase();

  console.log(`${'═'.repeat(98)}`);
  console.log(`📋 ${p.userEmail}  •  ${p.id}  •  ${p.goal}  •  créé ${(p.createdAt||'').substring(0,16)}`);
  console.log(`   ${profile.age||'?'}ans ${profile.sex||'?'} | ${profile.level||'?'} | EF ${efPace} | phase S1: ${w1?.phase}`);
  const activeFlags = Object.entries(flags).filter(([,v]) => v).map(([k]) => k);
  console.log(`   Flags: ${activeFlags.join(', ') || 'aucun'}`);

  if (phaseLc !== 'fondamental' && phaseLc !== 'recuperation') {
    console.log(`   ⏭️  phase "${w1?.phase}" hors scope\n`);
    continue;
  }

  const joggings = (w1?.sessions || []).filter(s => s.type === 'Jogging' && (!s.intensity || s.intensity === 'Facile'));
  const marcheCourse = (w1?.sessions || []).filter(s => /marche.?course/i.test(s.type || ''));
  if (joggings.length === 0) {
    if (marcheCourse.length > 0) {
      console.log(`   ⏭️  ${marcheCourse.length} séance(s) Marche/Course (débutant) — hors scope par décision\n`);
      totalSkipped++;
    } else {
      console.log(`   ⏭️  aucune séance Jogging Facile en S1\n`);
    }
    continue;
  }

  // Itérer avec l'index réel dans w1.sessions (pas l'index filtré)
  (w1.sessions || []).forEach((session, idx) => {
    if (session.type !== 'Jogging' || (session.intensity && session.intensity !== 'Facile')) return;
    const variant = buildFootingVariant({
      weekNumber: 1, sessionIndex: idx,
      goal: p.goal || '',
      durationStr: session.duration || '45 min',
      efPace: efPace || session.targetPace || '',
      flags,
      sessionElevation: session.elevationGain,
      sessionTitle: session.title,
      seed: p.id,
    });
    const reliefSlugs = ['footing_cotes_douces', 'footing_cotes_courtes_marche', 'footing_terrain_varie', 'footing_sentier_roulant'];
    const sessionHasDplus = (session.elevationGain || 0) > 0 || /vallonn|colline|c[ôo]te|d\+|denivel|d[ée]nivel|mont[ée]e/i.test(session.title || '');
    const variantIsRelief = reliefSlugs.includes(variant.slug);
    const coherent = sessionHasDplus === variantIsRelief;
    console.log(`\n   ── ${session.day} (${session.duration}, ${session.distance||'-'}, D+${session.elevationGain||0}m) ──`);
    console.log(`   AVANT : "${session.title}"`);
    console.log(`           ${(session.mainSet||'').substring(0,105)}`);
    console.log(`   APRÈS : "${variant.title}"  [${variant.slug}]  ${coherent ? '✅' : '🚨 INCOHÉRENT'}`);
    console.log(`           ${variant.mainSet.substring(0,105)}`);
  });
  totalModifiable++;
  console.log('');
}

console.log(`${'═'.repeat(98)}`);
console.log(`DRY-RUN terminé — AUCUNE écriture. ${totalModifiable} plan(s) modifiable(s), ${totalSkipped} skippé(s) (débutants Marche/Course).`);
