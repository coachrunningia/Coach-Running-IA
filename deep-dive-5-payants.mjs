// Pour chacun des 5 vrais payants : source VMA, inputs réels, ajustements
import { execSync } from 'child_process';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

const PAYANTS = [
  { email: 'mymydeletttre@gmail.com', cas: 'CAS 2 RISQUE', target: '10K 1h10', plan: '4:56', expected: '7:00' },
  { email: 'berrebiariel94@hotmail.com', cas: 'CAS 1 ambitieux', target: '10K 30min', plan: '4:47', expected: '3:00' },
  { email: 'sarah.lefrancq@yahoo.com', cas: 'CAS 2 RISQUE', target: 'Mara 5h', plan: '4:50', expected: '7:07' },
  { email: 'romane.m2@hotmail.fr', cas: 'CAS 2 RISQUE', target: 'Semi 2h15', plan: '4:33', expected: '6:24' },
  { email: 'mhbrx06@gmail.com', cas: 'CAS 1 ambitieux', target: '10K 1h', plan: '7:22', expected: '6:00' },
];

function ex(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(ex);
  if ('mapValue' in v) {
    const out = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) out[k] = ex(val);
    return out;
  }
  return v;
}

console.log(`\n═══════════════════════════════════════════════════════════════`);
console.log(`  DEEP DIVE — 5 vrais payants : source VMA + inputs`);
console.log(`═══════════════════════════════════════════════════════════════\n`);

for (const p of PAYANTS) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 ${p.email} — ${p.cas}`);
  console.log(`   Cible: ${p.target}  |  Plan affiche: ${p.plan}  |  Attendu: ${p.expected}`);
  console.log(`${'='.repeat(80)}`);

  // 1. Trouver UID
  const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`,
    { method:'POST', headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json','x-goog-user-project':PROJECT},
      body: JSON.stringify({ email:[p.email] }) });
  const uid = (await lookup.json()).users?.[0]?.localId;
  if (!uid) { console.log('  ❌ UID non trouvé'); continue; }
  console.log(`  UID: ${uid}`);

  // 2. Doc user
  const userDoc = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`,
    { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
  const uf = (await userDoc.json()).fields || {};

  console.log(`  💳 isPremium: ${ex(uf.isPremium)}, hasPurchasedPlan: ${ex(uf.hasPurchasedPlan)}`);
  console.log(`  📅 lastLogin: ${ex(uf.lastLoginAt) || '?'}`);

  // 3. Tous ses plans (peut-être plusieurs, garde le plus récent)
  const plansResp = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,
    { method:'POST', headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json','x-goog-user-project':PROJECT},
      body: JSON.stringify({ structuredQuery: { from:[{collectionId:'plans'}], where:{ fieldFilter:{ field:{fieldPath:'userId'}, op:'EQUAL', value:{stringValue:uid} } } } }) });
  const plans = (await plansResp.json()).filter(r => r.document);
  console.log(`  📑 ${plans.length} plan(s) total :`);

  for (const planRaw of plans) {
    const pl = {};
    for (const [k, v] of Object.entries(planRaw.document.fields || {})) pl[k] = ex(v);
    const pid = planRaw.document.name.split('/').pop();
    const ctx = pl.generationContext || {};
    const isCurrentlyBugged = plans.indexOf(planRaw) === 0; // assumption: 1er plan = actuel

    console.log(`\n    🗂️  Plan ${pid}`);
    console.log(`       Distance: ${pl.distance}  | weeks: ${pl.weeks?.length}  | isPreview: ${pl.isPreview}`);
    console.log(`       createdAt: ${(pl.createdAt || '').substring(0,19)}`);
    console.log(`       confidenceScore: ${pl.confidenceScore}  | feasibilityStatus: ${pl.feasibilityStatus || '?'}`);
    console.log(`       VMA: ${ctx.vma}  | vmaSource: "${ctx.vmaSource}"`);

    // Allure spé course par distance
    const dist = pl.distance;
    const paceKey = dist?.includes('Marathon') && !dist?.includes('Semi') ? 'allureSpecifiqueMarathon' :
                    dist?.includes('Semi') ? 'allureSpecifiqueSemi' :
                    dist?.includes('10') ? 'allureSpecifique10k' :
                    dist?.includes('5') ? 'allureSpecifique5k' : null;
    if (paceKey && ctx.paces) console.log(`       ${paceKey} (allure spé): ${ctx.paces[paceKey]}`);

    // Questionnaire
    const q = ctx.questionnaire || pl.questionnaireData || {};
    if (q) {
      console.log(`       ➜ INPUTS user :`);
      console.log(`         level: ${q.level}`);
      console.log(`         targetTime: ${q.targetTime}`);
      console.log(`         hasChrono: ${q.hasChrono}`);
      console.log(`         currentVolume: ${q.currentVolume} km/sem`);
      console.log(`         frequency: ${q.frequency} séances/sem`);
      if (q.recentRaceTimes && Object.keys(q.recentRaceTimes).length > 0) {
        console.log(`         🏁 Chronos RÉCENTS saisis :`);
        for (const [k, v] of Object.entries(q.recentRaceTimes)) {
          if (v) console.log(`           ${k}: ${v}`);
        }
      } else {
        console.log(`         🏁 Chronos récents : (aucun)`);
      }
      console.log(`         hasInjury: ${q.hasInjury || q.injuries?.hasInjury}`);
    }

    // Champs ajustés
    if (pl._patchedManuallyAt) console.log(`       ⚠️ Patché manuellement: ${pl._patchedManuallyAt}`);
    if (pl._vmaRecalculatedAt) console.log(`       🔄 VMA recalculée: ${pl._vmaRecalculatedAt}`);
    if (pl.adaptationCount) console.log(`       🔄 Adaptations: ${pl.adaptationCount}`);
  }
}

console.log(`\n\n═══════════════════════════════════════════════════════════════`);
console.log(`✅ Audit terminé`);
console.log(`═══════════════════════════════════════════════════════════════`);
