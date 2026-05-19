/**
 * ÉCRITURE — applique les variantes de footing sur la S1 des 10 derniers plans.
 * Sauvegarde chaque plan complet avant modification. Ne touche QUE le titre /
 * warmup / mainSet / cooldown / advice des séances Jogging Facile de la S1.
 */
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { buildFootingVariant, detectFootingFlags } from '/tmp/footing-bundle.mjs';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const BACKUP_DIR = `backup-footing-diversite-${new Date().toISOString().substring(0, 10)}`;
mkdirSync(BACKUP_DIR, { recursive: true });

function pv(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue) return (v.arrayValue.values || []).map(pv);
  if (v.mapValue) return pf(v.mapValue.fields);
  return null;
}
function pf(fields) { if (!fields) return {}; const o = {}; for (const [k, v] of Object.entries(fields)) o[k] = pv(v); return o; }

function toFs(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFs) } };
  if (typeof v === 'object') {
    const fields = {};
    for (const [k, val] of Object.entries(v)) fields[k] = toFs(val);
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}

// 10 derniers plans
const r = await fetch(`${BASE}:runQuery`, {
  method: 'POST', headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ structuredQuery: {
    from: [{ collectionId: 'plans' }],
    orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
    limit: 10,
  } }),
});
const data = await r.json();
const plans = (Array.isArray(data) ? data : []).filter(x => x.document)
  .map(x => ({ id: x.document.name.split('/').pop(), raw: x.document.fields, ...pf(x.document.fields) }));

console.log(`${plans.length} derniers plans récupérés.\n`);
let modified = 0, skipped = 0;

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

  if (phaseLc !== 'fondamental' && phaseLc !== 'recuperation') {
    console.log(`⏭️  ${p.userEmail} — phase S1 "${w1?.phase}" hors scope`); skipped++; continue;
  }
  const joggings = (w1?.sessions || []).filter(s => s.type === 'Jogging' && (!s.intensity || s.intensity === 'Facile'));
  if (joggings.length === 0) {
    console.log(`⏭️  ${p.userEmail} — aucune séance Jogging Facile en S1`); skipped++; continue;
  }

  // Sauvegarde du plan complet AVANT modification
  writeFileSync(`${BACKUP_DIR}/${p.id}.json`, JSON.stringify(p.raw, null, 2));

  let touched = 0;
  w1.sessions.forEach((session, idx) => {
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
    session.title = variant.title;
    session.warmup = variant.warmup;
    session.mainSet = variant.mainSet;
    session.cooldown = variant.cooldown;
    session.advice = variant.advice;
    touched++;
  });

  // PATCH du champ weeks uniquement
  const resp = await fetch(`${BASE}/plans/${p.id}?updateMask.fieldPaths=weeks`, {
    method: 'PATCH', headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { weeks: toFs(p.weeks) } }),
  });
  if (resp.ok) { console.log(`✅ ${p.userEmail} — ${touched} séance(s) S1 diversifiée(s)`); modified++; }
  else { console.log(`🚨 ${p.userEmail} — échec PATCH ${resp.status}: ${(await resp.text()).substring(0, 200)}`); }
}

console.log(`\n${modified} plan(s) modifié(s), ${skipped} skippé(s). Backups dans ${BACKUP_DIR}/`);
