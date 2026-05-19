/**
 * DRY-RUN — applique (en simulation, AUCUNE écriture) les variantes de footing
 * sur les plans freemium des 10 derniers inscrits.
 * Montre AVANT / APRÈS pour chaque séance Jogging de la S1.
 */
import { execSync } from 'child_process';
import { buildFootingVariant, detectFootingFlags } from '/tmp/footing-bundle.mjs';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';

const FREEMIUM_PLANS = [
  '1778702412108', // adrien_marcourt
  '1778667864907', // garrel.florian
  '1778648613186', // deugnilson freemium
  '1778575564571', // aureline.bossu
  '1778514063928', // charlottemalbosc (Hyrox)
  '1778427603608', // cindy.cauquot
];

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

for (const planId of FREEMIUM_PLANS) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${planId}`, {
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  const j = await r.json();
  if (!j.fields) { console.log(`\n❌ ${planId} introuvable`); continue; }
  const p = pf(j.fields);
  const ctx = p.generationContext || {};
  const q = ctx.questionnaireData || {};
  const snap = ctx.questionnaireSnapshot || {};
  const profile = { ...snap, ...q };

  const flags = detectFootingFlags({
    weight: profile.weight, height: profile.height, age: profile.age,
    level: profile.level, injuries: profile.injuries,
  });
  const efPace = p.paces?.efPace || '';

  console.log(`\n${'═'.repeat(95)}`);
  console.log(`📋 ${p.userEmail}  •  ${planId}  •  ${p.goal}  •  phase S1: ${p.weeks?.[0]?.phase}`);
  console.log(`   Profil: ${profile.age||'?'}ans ${profile.sex||'?'} | niveau ${profile.level||'?'} | EF ${efPace}`);
  console.log(`   Flags: ${Object.entries(flags).filter(([,v])=>v).map(([k])=>k).join(', ') || 'aucun'}`);
  console.log(`${'═'.repeat(95)}`);

  const w1 = p.weeks?.[0];
  const phaseLc = (w1?.phase || 'fondamental').toLowerCase();
  if (phaseLc !== 'fondamental' && phaseLc !== 'recuperation') {
    console.log(`  ⏭️  Phase S1 = "${w1?.phase}" → hors scope (on ne touche que fondamental/récupération)`);
    continue;
  }

  for (const s of (w1?.sessions || [])) {
    if (s.type !== 'Jogging' || (s.intensity && s.intensity !== 'Facile')) continue;
    const variant = buildFootingVariant({
      weekNumber: 1,
      goal: p.goal || '',
      durationStr: s.duration || '45 min',
      efPace: efPace || s.targetPace || '',
      flags,
      seed: planId,
    });
    console.log(`\n  ── ${s.day} (${s.duration}, ${s.distance||'-'}) ──`);
    console.log(`  AVANT : "${s.title}"`);
    console.log(`          ${(s.mainSet||'').substring(0,110)}`);
    console.log(`  APRÈS : "${variant.title}"  [${variant.slug}]`);
    console.log(`          ${variant.mainSet.substring(0,110)}`);
    if (variant.addsElevation && (!s.elevationGain || s.elevationGain === 0)) {
      const km = parseFloat(String(s.distance||'0').replace(',','.').replace(/[^0-9.]/g,''));
      console.log(`          → D+ ajusté : 0m → ${Math.round(km*15)}m`);
    }
  }
}
console.log(`\n${'═'.repeat(95)}`);
console.log(`DRY-RUN terminé — AUCUNE modification appliquée.`);
