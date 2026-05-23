import { execSync } from 'child_process';
import fs from 'fs';
const accessToken = execSync('gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null').toString().trim();
const fetch = (await import('node-fetch')).default;
const projectId = 'coach-running-ia';
const planId = '1779456984279';
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

const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/plans/${planId}`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
const doc = await res.json();
const plan = {};
for (const [k, v] of Object.entries(doc.fields)) plan[k] = parseFs(v);

const backup = `/Users/romanemarino/Coach-Running-IA/backup-christopher-${Date.now()}.json`;
fs.writeFileSync(backup, JSON.stringify(plan, null, 2));
console.log(`✅ Backup: ${backup}`);

// ── Item 4 fix : S1 = 1 footing court + 1 SL (au lieu de 2 SL identiques)
// Coach Pfitzinger FRR ch.4 : footing court 35-60% de la SL pour différencier les stimuli
// Ici SL 13 km → footing court 7 km (54% de la SL) = règle respectée
const oldSessions = plan.weeks[0].sessions;
const newSessions = [
  // J1 Mardi : Footing court (au lieu de SL identique à samedi)
  {
    ...oldSessions[0],
    type: 'Jogging',
    title: 'Footing court de mise en route',
    distance: '7 km',
    duration: '50 min',
    targetPace: '6:53 min/km',
    mainSet: "50 min de footing court en endurance fondamentale (6:53/km), allure conversationnelle. Cette séance courte sert de mise en route hebdo : on relance la machine sans la sursolliciter. Focus posture et fréquence de pas (Pfitzinger FRR ch.4 — séances différenciées en freq=3).",
  },
  // J2 Jeudi : Renforcement (inchangé)
  oldSessions[1],
  // J3 Samedi : Sortie Longue (inchangée, c'est la séance pivot)
  oldSessions[2],
];

// ── Items 6 + 9 anticipés : welcome avec transparence freq=3 + justification 20 sem
// Doctrine `feedback_securite_avant_conversion` : transparence brutale chiffrée
// Doctrine `feedback_jamais_baisser_allure_cible` : cible 1h45 conservée intacte
const NEW_WELCOME = `Bienvenue dans ta préparation pour le semi-marathon en 1h45 du 1er novembre 2026.

Avant d'attaquer, deux points de transparence essentiels :

1) Ton PB semi actuel est 2h04, viser 1h45 demande un gain de 19 min sur 21,1 km (-15%). C'est un objectif AMBITIEUX qui suppose une vraie progression VMA + seuil. On respecte ta cible (allure 4:59/km), mais sois conscient que le gap théorique-réel est important.

2) Tu as choisi 3 séances/sem, dont 1 renforcement = 2 séances course/sem. Pour viser 1h45 sur semi, le référentiel coach (Pfitzinger Faster Road Racing) recommande 4-5 séances/sem et 45-65 km/sem en pic. Avec 2 séances/sem, le plafond physique de progression est plus bas. Si tu peux ajouter 1 séance facile dans la semaine (footing 30 min mercredi par ex.), ton pic potentiel augmentera nettement. Sinon, on optimise au mieux avec ce que tu peux donner — le plan reste construit pour 1h45.

Pourquoi 20 semaines ? Parce qu'avec un gap de 15% à combler, on a précisément besoin de ce temps pour développer VMA et seuil sans te griller. Une prépa plus courte (8-12 sem) ne te ferait que maintenir ton niveau actuel.

Structure du plan : phase fondamentale (S1-S6) pour bâtir la base aérobie, développement (S8-S12) pour le seuil, spécifique (S14-S18) pour l'allure semi, affûtage (S19-S20). Renforcement quadriceps/gainage chaque jeudi pour prévenir les blessures.

Nous te recommandons de consulter un médecin avant de débuter ce programme et d'obtenir un certificat médical d'aptitude au sport.`;

const updates = {
  welcomeMessage: NEW_WELCOME,
  weeks: [{ ...plan.weeks[0], sessions: newSessions }, ...plan.weeks.slice(1)],
};

// Update weeklyVolumes[0] from 26 to 20 (sum new sessions)
if (plan.generationContext?.periodizationPlan) {
  const newVols = [...(plan.generationContext.periodizationPlan.weeklyVolumes || [])];
  newVols[0] = 20; // 7 + 13 = 20 km
  updates.generationContext = {
    ...plan.generationContext,
    periodizationPlan: {
      ...plan.generationContext.periodizationPlan,
      weeklyVolumes: newVols,
    },
  };
}

console.log('\n📋 Modifications Christopher :');
console.log(`  welcomeMessage : ${NEW_WELCOME.length} chars (transparence freq=3 + justification 20 sem + cible 1h45 intacte)`);
console.log(`  S1 J1 : SL 13 km / 1h30 → Footing court 7 km / 50 min (Item 4 fix)`);
console.log(`  S1 J3 : Sortie Longue 13.1 km (inchangée)`);
console.log(`  S1 total : 26 km → 20 km (volume initial plus raisonnable)`);
console.log(`  weeklyVolumes[0] : 26 → 20`);

if (DRY) {
  console.log('\n🛑 DRY-RUN — aucune modif Firestore.');
  process.exit(0);
}

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
  console.error('❌ ERROR:', JSON.stringify(patchResult.error, null, 2));
  process.exit(1);
}
console.log(`\n✅ PATCH APPLIQUÉ — updateTime: ${patchResult.updateTime}`);

// Verif
const verifRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
const verifDoc = await verifRes.json();
const verifPlan = {};
for (const [k, v] of Object.entries(verifDoc.fields)) verifPlan[k] = parseFs(v);
console.log('\n🔍 VÉRIFICATION POST-PATCH :');
console.log(`  S1 J1 type/title : ${verifPlan.weeks[0].sessions[0].type} — ${verifPlan.weeks[0].sessions[0].title}`);
console.log(`  S1 J1 dist/dur : ${verifPlan.weeks[0].sessions[0].distance} / ${verifPlan.weeks[0].sessions[0].duration}`);
console.log(`  S1 J3 type/title : ${verifPlan.weeks[0].sessions[2].type} — ${verifPlan.weeks[0].sessions[2].title}`);
console.log(`  S1 J3 dist/dur : ${verifPlan.weeks[0].sessions[2].distance} / ${verifPlan.weeks[0].sessions[2].duration}`);
console.log(`  weeklyVolumes[0] : ${verifPlan.generationContext?.periodizationPlan?.weeklyVolumes?.[0]}`);
console.log(`  welcomeMessage : ${verifPlan.welcomeMessage?.length} chars`);
