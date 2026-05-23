/**
 * Audit batch — Bug 17 Sprint E
 * Compte les plans en base avec plan.startDate ≠ questionnaireSnapshot.startDate.
 * LECTURE SEULE — pas de patch (doctrine feedback_patch_live_plans_jour_seulement).
 *
 * Usage : node audit-startdate-impact.mjs
 *
 * Output : nombre de plans impactés + liste IDs + délai en jours entre
 *          questionnaire saisi et startDate alignée monday.
 */
import { execSync } from 'child_process';

const accessToken = execSync(
  'gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null'
).toString().trim();
const fetch = (await import('node-fetch')).default;

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

async function runQuery(q) {
  const r = await fetch(
    `https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery: q }),
    }
  );
  return await r.json();
}

function dayName(dateStr) {
  if (!dateStr) return '?';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][dt.getDay()];
}

function diffDays(a, b) {
  if (!a || !b) return null;
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  const dtA = new Date(ya, ma - 1, da);
  const dtB = new Date(yb, mb - 1, db);
  return Math.round((dtA.getTime() - dtB.getTime()) / (24 * 60 * 60 * 1000));
}

// === Query plans 30 derniers jours ===
const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

console.log('Audit lecture seule — Bug 17 Sprint E (startDate impact)');
console.log(`Fenêtre : createdAt >= ${THIRTY_DAYS_AGO}\n`);

const res = await runQuery({
  from: [{ collectionId: 'plans' }],
  where: {
    fieldFilter: {
      field: { fieldPath: 'createdAt' },
      op: 'GREATER_THAN_OR_EQUAL',
      value: { stringValue: THIRTY_DAYS_AGO },
    },
  },
  limit: 1000,
});

const plans = (res || []).filter((x) => x.document);
console.log(`Total plans 30j : ${plans.length}\n`);

const impacted = [];
for (const d of plans) {
  const f = {};
  for (const [k, v] of Object.entries(d.document.fields || {})) f[k] = parseFs(v);

  const planStartDate = f.startDate;
  const qsStartDate = f.generationContext?.questionnaireSnapshot?.startDate;

  if (!planStartDate || !qsStartDate) continue;
  if (planStartDate === qsStartDate) continue;

  const delta = diffDays(planStartDate, qsStartDate);
  impacted.push({
    id: d.document.name.split('/').pop(),
    userId: f.userId,
    qsStartDate,
    qsDay: dayName(qsStartDate),
    planStartDate,
    planDay: dayName(planStartDate),
    deltaDays: delta,
    isPreview: f.isPreview,
    createdAt: d.document.createTime,
  });
}

console.log(`Plans impactés (startDate ≠ questionnaireSnapshot.startDate) : ${impacted.length}\n`);

if (impacted.length > 0) {
  console.log('Détail :');
  impacted
    .sort((a, b) => Math.abs(b.deltaDays || 0) - Math.abs(a.deltaDays || 0))
    .forEach((p, i) => {
      console.log(
        `  ${i + 1}. ${p.id} | user=${p.userId} | saisi=${p.qsStartDate} (${p.qsDay}) → stocké=${p.planStartDate} (${p.planDay}) | Δ=${p.deltaDays}j | preview=${p.isPreview}`
      );
    });
}

console.log('\nDone.');
