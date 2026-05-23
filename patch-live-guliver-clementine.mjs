import { execSync } from 'child_process';
import fs from 'fs';
const accessToken = execSync('gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null').toString().trim();
const fetch = (await import('node-fetch')).default;
const projectId = 'coach-running-ia';
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

async function fetchPlan(planId) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/plans/${planId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const doc = await res.json();
  if (!doc.fields) throw new Error(`Plan ${planId} not found`);
  const plan = {};
  for (const [k, v] of Object.entries(doc.fields)) plan[k] = parseFs(v);
  return { plan, url };
}

async function applyPatch(planId, updates, label) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/plans/${planId}`;
  const fields = {};
  for (const [k, v] of Object.entries(updates)) fields[k] = toFs(v);
  const updateMaskParams = Object.keys(updates).map(k => `updateMask.fieldPaths=${k}`).join('&');
  const patchUrl = `${url}?${updateMaskParams}`;
  if (DRY) {
    console.log(`\n🛑 DRY ${label} — would patch ${Object.keys(updates).length} fields: ${Object.keys(updates).join(', ')}`);
    return;
  }
  const patchRes = await fetch(patchUrl, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  const patchResult = await patchRes.json();
  if (patchResult.error) {
    console.error(`❌ ERROR ${label}:`, JSON.stringify(patchResult.error, null, 2));
    process.exit(1);
  }
  console.log(`✅ ${label} patché — updateTime ${patchResult.updateTime}`);
}

// ═════════════════════════════════════════
// PLAN A — GULIVER 1779433945589
// ═════════════════════════════════════════
console.log('\n══════════════════════════════════════════════════════');
console.log('PLAN A — GULIVER (1779433945589) — 72 ans Marathon 3h55');
console.log('══════════════════════════════════════════════════════');
const guliverId = '1779433945589';
const { plan: guliver } = await fetchPlan(guliverId);

const backupGuliver = `/Users/romanemarino/Coach-Running-IA/backup-guliver-${Date.now()}.json`;
fs.writeFileSync(backupGuliver, JSON.stringify(guliver, null, 2));
console.log(`✅ Backup: ${backupGuliver}`);

// Doctrine `feedback_securite_avant_conversion` : transparence (PB 4h10, âge 72, gain 15min ambitieux).
// Doctrine `feedback_jamais_baisser_allure_cible` : cible 3h55 conservée, on prévient seulement.
// Doctrine `feedback_jamais_poids_minceur` : aucune mention poids/IMC.
const GULIVER_WELCOME = `Bienvenue dans ta préparation pour le Marathon de décembre 2026. Ce programme de 24 semaines a été calibré pour un coureur Expert de 72 ans visant 3h55, soit un gain de 15 minutes sur ton PB marathon de 4h10. C'est un objectif AMBITIEUX à ton âge : la VMA reste un bon prédicteur d'aisance, mais la récupération inter-séance et l'adaptation aérobie sont plus longues après 70 ans (Pfitzinger Masters, Hammond Endurance Masters). On respecte ta cible, mais nous te recommandons : (1) un bilan cardio-vasculaire avant de démarrer, (2) une vigilance sur la récupération (sommeil, alimentation, semaines de décharge respectées à la lettre), (3) revoir l'objectif vers 4h00-4h05 si la S6-S8 te paraissent difficiles. Le bloc fondamental S1-S4 développe l'endurance aérobie sans recherche d'intensité. Tu peux ajuster ton volume actuel dans ton profil si tu cours en réalité plus que 50 km/sem.`;

const GULIVER_FEASIBILITY_MSG = `Avec ta VMA de 13.5 km/h, ton temps théorique sur marathon est d'environ 3h54 — théoriquement cohérent avec 3h55. MAIS deux signaux modèrent la confiance : (1) à 72 ans, la VMA surévalue le potentiel aérobie marathon (perte VO2max 0.5-1%/an après 60, Hammond) ; (2) ton PB marathon de 4h10 et ton 1h49 semi (théorique marathon ~3h50) sont cohérents entre eux mais demandent +6% de gain en 24 sem, exigeant à ton âge. Plan tenable avec vigilance, repos strict et bilan cardio préalable. Si la S6-S8 sont difficiles, repositionne vers 4h00.`;

// Justification ligne à ligne (cf. PATCH-LIVE-GULIVER-CLEMENTINE.md L37-43) :
// - S1-S8 inchangées sauf S9-S11 progression linéaire vs plateau
// - S15=82, S19=86 : vrais pics francs (Pfitzinger ch.4 "key long run weeks")
// - S21=78 (vs 74) : dernière SL dense
// - S22-S24 : 60/50/40 affûtage -25%/sem (Hammond Masters)
const GULIVER_WEEKLY_VOLUMES = [50, 56, 63, 50, 57, 66, 76, 61, 68, 74, 80, 64, 70, 76, 82, 64, 74, 80, 86, 68, 78, 60, 50, 40];

// Sessions S1 — fix Bug #1 (allures variation), Bug #4 (type Marche/Course → Sortie Longue)
const guliverWeeks = guliver.weeks || [];
const newGuliverS1 = { ...guliverWeeks[0] };
const oldSessions = guliverWeeks[0]?.sessions || [];
// Strategy : on rebuild les 5 sessions S1 dans l'ordre attendu
newGuliverS1.sessions = [
  // J1 Lundi - Footing EF pure (Daniels : S1 démarre EF pure, pas négative split)
  {
    ...oldSessions[0],
    type: 'Jogging',
    title: 'Footing en endurance fondamentale',
    distance: '10 km',
    duration: '66 min',
    targetPace: '6:38/km',
    mainSet: "10 km en endurance fondamentale à 6:38/km, conversationnel du début à la fin. C'est la séance de mise en route du cycle, aucune recherche d'intensité. (allure : 6:38/km)",
  },
  // J2 Mardi - inchangé (footing + gammes déjà OK)
  oldSessions[1],
  // J3 Mercredi - Renforcement inchangé
  oldSessions[2],
  // J4 Vendredi - Footing vallonné avec format pace variation (Bug #1 fix)
  {
    ...oldSessions[3],
    type: 'Jogging',
    title: 'Footing vallonné en forêt',
    distance: '11 km',
    duration: '80 min',
    targetPace: '7:24 → 6:38',
    mainSet: "15 min échauffement en récupération (7:24), puis 53 min à allure EF (6:38) sur terrain vallonné — pas de recherche de vitesse en montée, on monte au ressenti, on profite des descentes. 12 min retour au calme et étirements.",
  },
  // J5 Dimanche - SL : type Marche/Course → Sortie Longue (Bug #4 fix), pace variation (Bug #1)
  {
    ...oldSessions[4],
    type: 'Sortie Longue',
    title: 'Sortie Longue (négative split 18 km)',
    distance: '18 km',
    duration: '119 min',
    targetPace: '7:24 → 6:38',
    mainSet: "20 min échauffement très lent (7:24), puis 18 km découpés en deux moitiés : 1re moitié bas de l'EF (autour de 7:00), 2e moitié haut de l'EF (6:38). Aucune marche programmée, mais autorise-toi 30s de marche pour boire/respirer si nécessaire — sans en faire une habitude. 10 min retour au calme.",
  },
];

const guliverUpdates = {
  welcomeMessage: GULIVER_WELCOME,
  feasibility: { ...guliver.feasibility, status: 'AMBITIEUX', message: GULIVER_FEASIBILITY_MSG },
  confidenceScore: 70,
  weeks: [newGuliverS1, ...guliverWeeks.slice(1)], // S1 patchée, reste inchangé (S2-S24 pas encore générées, fullPlanGenerated=false)
};
if (guliver.generationContext?.periodizationPlan) {
  guliverUpdates.generationContext = {
    ...guliver.generationContext,
    periodizationPlan: {
      ...guliver.generationContext.periodizationPlan,
      weeklyVolumes: GULIVER_WEEKLY_VOLUMES,
    },
  };
}

console.log('\n📋 Modifications Guliver :');
console.log(`  welcomeMessage : ${GULIVER_WELCOME.length} chars (nouveau)`);
console.log(`  feasibility.status : ${guliver.feasibility?.status} → AMBITIEUX`);
console.log(`  confidenceScore : ${guliver.confidenceScore} → 70`);
console.log(`  weeklyVolumes : pic ${Math.max(...(guliver.generationContext?.periodizationPlan?.weeklyVolumes || []))} → ${Math.max(...GULIVER_WEEKLY_VOLUMES)} (S19 vrai pic franc)`);
console.log(`  S1 sessions : 5 séances remplacées (J5 SL type Marche/Course → Sortie Longue, pace 7:24→6:38)`);

await applyPatch(guliverId, guliverUpdates, 'Guliver');

// ═════════════════════════════════════════
// PLAN B — CLÉMENTINE 1779433173116
// ═════════════════════════════════════════
console.log('\n══════════════════════════════════════════════════════');
console.log('PLAN B — CLÉMENTINE (1779433173116) — 30 ans F Marathon 4h50');
console.log('══════════════════════════════════════════════════════');
const clementineId = '1779433173116';
const { plan: clementine } = await fetchPlan(clementineId);

const backupClementine = `/Users/romanemarino/Coach-Running-IA/backup-clementine-${Date.now()}.json`;
fs.writeFileSync(backupClementine, JSON.stringify(clementine, null, 2));
console.log(`✅ Backup: ${backupClementine}`);

// Doctrine `feedback_securite_avant_conversion` : chiffres bruts +60% Gabbett 1.6 (pas "un peu plus").
// Doctrine `feedback_patch_live_plans_jour_seulement` : S1 INTOUCHABLE (vécue J+5).
// Doctrine `feedback_jamais_baisser_allure_cible` : cible 4h50 conservée.
const CLEMENTINE_WELCOME = `Bienvenue dans ton programme marathon 4h50, 10 semaines. Tu as démarré ta S1 le 18 mai à 40 km — c'était +60% au-dessus de ton volume actuel (25 km/sem), un saut au-delà de la zone de progression recommandée (ratio Gabbett 1.6). On a recalé les semaines à venir pour casser cette trajectoire et te ramener dans une rampe maîtrisable. Concrètement, S2 redescend à 35 km, puis on remonte progressivement vers un pic réaliste à S7. Si tu ressens une douleur inhabituelle (tendon, genou, mollet) ou une fatigue qui dure > 48h, repose-toi un jour de plus et envoie un message au support. Le plan reste optimisé pour 4h50 ; cible et calendrier inchangés. Tu peux ajuster ton volume actuel dans ton profil si tu cours réellement plus que 25 km/sem.`;

const CLEMENTINE_FEASIBILITY_MSG = `Avec ta VMA de 11.0 km/h, ton temps théorique marathon est ~4h47 — ta cible 4h50 reste cohérente. MAIS trois facteurs limitent la confiance : (1) ta S1 démarre à 40 km alors que ton vol actuel est 25 km/sem, soit +60% (ratio Gabbett 1.6, zone rouge), (2) ton pic prévu 56 km = 2.24× ton vol actuel, au-delà de la rampe recommandée (cap 2.0), (3) une prépa marathon en 10 sem avec cv 25 est intrinsèquement serrée. On a redistribué S2-S10 pour aplanir la trajectoire, mais surveille bien les signaux de surcharge (sommeil dégradé, jambes lourdes > 48h, douleur localisée). Tu as la marge pour terminer 4h50 si tu écoutes ton corps.`;

// Justification ligne à ligne (cf. PATCH-LIVE-GULIVER-CLEMENTINE.md L120-127) :
// - S1=40 INTACT (vécue, doctrine immuable)
// - S2 43→35 : casse trajectoire ACWR (ratio glissant 1.6→1.2 zone verte)
// - S3 47→38 : consolide la baisse, équivalent récup post-saut
// - S4 récup 37→32 : alléger un peu plus
// - S5-S7 43/49/56 → 40/46/52 : remontée linéaire, pic abaissé 56→52 (pic/cv 2.08)
// - S8-S10 affûtage 46/40/32 → 42/36/28 : tapering Pfitzinger -10%/sem
const CLEMENTINE_WEEKLY_VOLUMES = [40, 35, 38, 32, 40, 46, 52, 42, 36, 28];

const clementineUpdates = {
  welcomeMessage: CLEMENTINE_WELCOME,
  feasibility: { ...clementine.feasibility, status: 'RISQUÉ', message: CLEMENTINE_FEASIBILITY_MSG },
  confidenceScore: 40,
};
if (clementine.generationContext?.periodizationPlan) {
  clementineUpdates.generationContext = {
    ...clementine.generationContext,
    periodizationPlan: {
      ...clementine.generationContext.periodizationPlan,
      weeklyVolumes: CLEMENTINE_WEEKLY_VOLUMES,
    },
  };
}
// S1 (clementine.weeks[0]) INTACTE — on ne touche PAS weeks[0]
// Plan n'a actuellement qu'1 sem générée → on ne push pas weeks (sera regénéré par fullPlanGenerated avec nouveaux weeklyVolumes)

console.log('\n📋 Modifications Clémentine :');
console.log(`  welcomeMessage : ${CLEMENTINE_WELCOME.length} chars (transparence "+60% Gabbett 1.6")`);
console.log(`  feasibility.status : ${clementine.feasibility?.status} (conservé RISQUÉ, message renforcé)`);
console.log(`  confidenceScore : ${clementine.confidenceScore} → 40`);
console.log(`  weeklyVolumes : pic 56 → 52 (ratio pic/cv 2.08), S2 43→35 (casse ACWR)`);
console.log(`  S1 sessions : INCHANGÉES (vécues, doctrine immuable)`);

await applyPatch(clementineId, clementineUpdates, 'Clémentine');

// ═════════════════════════════════════════
// VÉRIFICATION POST-PATCH
// ═════════════════════════════════════════
if (!DRY) {
  console.log('\n🔍 VÉRIFICATION POST-PATCH :');
  
  const { plan: verifGuliver } = await fetchPlan(guliverId);
  console.log('\n— Guliver :');
  console.log(`  feasibility.status: ${verifGuliver.feasibility?.status} ${verifGuliver.feasibility?.status === 'AMBITIEUX' ? '✅' : '❌'}`);
  console.log(`  confidenceScore: ${verifGuliver.confidenceScore} ${verifGuliver.confidenceScore === 70 ? '✅' : '❌'}`);
  console.log(`  S1 J5 type: ${verifGuliver.weeks[0].sessions[4].type} ${verifGuliver.weeks[0].sessions[4].type === 'Sortie Longue' ? '✅' : '❌'}`);
  console.log(`  S1 J5 targetPace: ${verifGuliver.weeks[0].sessions[4].targetPace}`);
  console.log(`  weeklyVolumes[18] (S19 pic): ${verifGuliver.generationContext?.periodizationPlan?.weeklyVolumes?.[18]} ${verifGuliver.generationContext?.periodizationPlan?.weeklyVolumes?.[18] === 86 ? '✅' : '❌'}`);
  
  const { plan: verifClementine } = await fetchPlan(clementineId);
  console.log('\n— Clémentine :');
  console.log(`  feasibility.status: ${verifClementine.feasibility?.status}`);
  console.log(`  confidenceScore: ${verifClementine.confidenceScore} ${verifClementine.confidenceScore === 40 ? '✅' : '❌'}`);
  console.log(`  weeklyVolumes[1] (S2): ${verifClementine.generationContext?.periodizationPlan?.weeklyVolumes?.[1]} ${verifClementine.generationContext?.periodizationPlan?.weeklyVolumes?.[1] === 35 ? '✅' : '❌'}`);
  console.log(`  weeklyVolumes[6] (S7 pic): ${verifClementine.generationContext?.periodizationPlan?.weeklyVolumes?.[6]} ${verifClementine.generationContext?.periodizationPlan?.weeklyVolumes?.[6] === 52 ? '✅' : '❌'}`);
  console.log(`  S1 J1 (intouchée): dist=${verifClementine.weeks[0].sessions[0].distance} / pace=${verifClementine.weeks[0].sessions[0].targetPace}`);
}
