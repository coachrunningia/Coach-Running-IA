import { execSync } from 'child_process';
import fs from 'fs';
const accessToken = execSync('gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null').toString().trim();
const fetch = (await import('node-fetch')).default;
const projectId = 'coach-running-ia';
const planId = '1778942808369';
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

// FETCH current state
const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/plans/${planId}`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
const doc = await res.json();
const plan = {};
for (const [k, v] of Object.entries(doc.fields)) plan[k] = parseFs(v);

// BACKUP
const backupFile = `/Users/romanemarino/Coach-Running-IA/backup-ambre-painvin-${Date.now()}.json`;
fs.writeFileSync(backupFile, JSON.stringify(plan, null, 2));
console.log(`✅ Backup : ${backupFile}\n`);

// Verif race day session existante (S17 J3)
const weeks = plan.weeks || [];
console.log(`📅 ${weeks.length} semaines actuelles`);
const lastWeek = weeks[weeks.length - 1];
if (lastWeek?.sessions) {
  console.log('\n🏁 SÉANCE JOUR J ACTUELLE (S17 J3) :');
  const j3 = lastWeek.sessions[lastWeek.sessions.length - 1];
  console.log(`   type: ${j3.type} | title: ${j3.title}`);
  console.log(`   distance: ${j3.distance} | duration: ${j3.duration} | pace: ${j3.targetPace}`);
  console.log(`   mainSet: ${(j3.mainSet || '').slice(0, 200)}`);
}

// ═════════ NEW VALUES ═════════
const NEW_WELCOME = `Bienvenue Ambre, et bravo pour ce projet de semi à Nancy le 12 septembre.

⚠️ IMPORTANT — À LIRE AVANT DE COMMENCER

1) Consultation médicale OBLIGATOIRE avant le démarrage du plan. Prends rendez-vous avec un médecin du sport pour obtenir un certificat d'aptitude à la course à pied et faire évaluer ta douleur au genou. C'est non négociable.

2) Tu as mentionné une douleur au genou à 9 km/h. Or l'allure cible pour ton objectif 2h30 est 7:07/km, soit 8,4 km/h : tu te rapproches franchement de ce seuil. Tant que cette douleur n'a pas été évaluée par un médecin, ne démarre PAS le plan. Et si une douleur réapparaît pendant un entraînement (même légère), STOP immédiat, et tu reprends contact avec ton médecin avant de remettre les baskets.

3) Équipement : choisis une paire de chaussures running récentes, avec un bon amorti (modèles type "max cushion" — un vendeur spécialisé saura te guider). Renouvelle-les tous les 600-800 km.

4) Surfaces : privilégie la terre, l'herbe, les chemins forestiers ou la piste plutôt que le bitume. Nancy a de belles options (Parc de la Pépinière, forêt de Haye).

5) Échauffement systématique 10 min marche active + mobilité genou/cheville avant chaque footing. Étirements doux après.

Le plan est progressif, prudent, et chaque séance est sous tes sensations. À la moindre alerte : STOP, repos, médecin. La régularité prime sur la performance. On y va doucement, mais on y va bien. 💪`;

const NEW_FEASIBILITY_MSG = `Objectif déclaré : Semi 2h30 le 12/09/2026 à Nancy.

Plusieurs points appellent à la transparence totale :

• Ton PB Semi actuel est 3h05. Viser 2h30 demande de gagner 35 minutes sur 21,1 km, soit ~1'40"/km plus rapide. C'est un saut très important sur 17 semaines.

• Ton estimation VMA (8,73 km/h) projette un temps semi théorique aux alentours de 2h51. Autrement dit, ton profil actuel est plus aligné avec un objectif 2h51 que 2h30. On RESPECTE ta cible 2h30 — les séances seront calibrées sur l'allure 7:07/km correspondante — mais sois consciente que cette cible est ambitieuse et que la performance réelle dépendra de l'évolution de ta forme et du feu vert médical.

• Volume actuel 5 km/sem → la montée en charge sera progressive (règle ACWR) pour protéger articulations et tendons.

• POINT BLOQUANT : la douleur au genou que tu signales à 9 km/h impose une consultation médicale AVANT le démarrage du plan. À noter : l'allure cible 7:07/km = 8,4 km/h, juste sous ce seuil. Sans feu vert médecin, on ne lance pas.

Aucun chrono ne sera promis. Priorité absolue : finir en bonne santé.`;

const NEW_WEEKLY_VOLUMES = [8, 9.5, 11, 9, 11, 13, 11, 14, 15, 13, 17, 19, 16, 22, 24, 17, 12];

// Sessions S2 → S17 (index 1 to 16)
// Format: weekIdx -> {j1: {...}, j3: {...}}  (j2 = renfo NE PAS TOUCHER)
const SESSION_PATCHES = {
  1: { // S2
    j1: { title: 'Footing EF — base aérobie', distance: '4.0 km', duration: '41 min', targetPace: 'EF : 10:15 min/km', mainSet: "41 min en endurance fondamentale (EF) à 10:15 min/km. Allure conversationnelle, respiration facile, focus posture (regard horizon, foulée courte et fréquente)." },
    j3: { title: 'Sortie Longue EF', distance: '5.5 km', duration: '56 min', targetPace: 'EF : 10:15 min/km', mainSet: "56 min de course en EF à 10:15 min/km, parcours plat et roulant. Garde une allure très confortable, hydrate-toi si besoin." },
  },
  2: { // S3
    j1: { title: 'Footing EF', distance: '4.5 km', duration: '46 min', targetPace: 'EF : 10:15 min/km', mainSet: "46 min EF à 10:15 min/km. Focus fréquence de pas (petits pas rapides) pour limiter l'impact au sol." },
    j3: { title: 'Sortie Longue EF', distance: '6.5 km', duration: '67 min', targetPace: 'EF : 10:15 min/km', mainSet: "67 min en EF à 10:15 min/km sur les bords de Meurthe. Plaisir et régularité avant tout." },
  },
  3: { // S4 récup
    j1: { title: 'Footing récup', distance: '4.0 km', duration: '41 min', targetPace: 'EF : 10:15 min/km', mainSet: "41 min EF très douce à 10:15 min/km. Semaine de récupération : sensations légères, pas de forcing." },
    j3: { title: 'Sortie Longue calme', distance: '5.0 km', duration: '51 min', targetPace: 'EF : 10:15 min/km', mainSet: "51 min EF à 10:15 min/km, terrain plat (Canal). Effort minimal, respiration facile." },
  },
  4: { // S5
    j1: { title: 'Footing EF + éducatifs', distance: '4.5 km', duration: '46 min', targetPace: 'EF : 10:15 min/km', mainSet: "10 min EF à 10:15 min/km + 3-4 éducatifs (montées de genoux, talons-fesses) sur 30 m + 30 min EF retour." },
    j3: { title: 'Sortie Longue Parc', distance: '6.5 km', duration: '67 min', targetPace: 'EF : 10:15 min/km', mainSet: "67 min EF à 10:15 min/km dans le Parc de la Pépinière. Marche les côtes les plus raides si besoin." },
  },
  5: { // S6 dev
    j1: { title: 'Fartlek doux — intro intensité', distance: '5.0 km', duration: '49 min', targetPace: 'EF 10:15 / EA 8:55', mainSet: "49 min total : 15 min EF (10:15 min/km) + 4 × (30 s à EA 8:55 min/km / 1 min EF récup) + 10 min EF retour. JAMAIS au-dessus de 8:55, jamais d'allure VMA tant que pas de feu vert médecin." },
    j3: { title: 'Sortie Longue EF', distance: '8.0 km', duration: '82 min', targetPace: 'EF : 10:15 min/km', mainSet: "82 min EF à 10:15 min/km en forêt de Haye. Hydratation toutes les 30 min, gel ou banane à mi-course." },
  },
  6: { // S7 récup
    j1: { title: 'Footing récup', distance: '4.5 km', duration: '46 min', targetPace: 'EF : 10:15 min/km', mainSet: "46 min EF à 10:15 min/km, allure très souple. Décharge musculaire après la phase dev." },
    j3: { title: 'Sortie Longue calme', distance: '6.5 km', duration: '67 min', targetPace: 'EF : 10:15 min/km', mainSet: "67 min EF à 10:15 min/km, terrain plat. Volume sans pression de rythme." },
  },
  7: { // S8 dev
    j1: { title: 'Fartlek doux', distance: '5.5 km', duration: '54 min', targetPace: 'EF 10:15 / EA 8:55', mainSet: "54 min : 15 min EF + 6 × (30 s à EA 8:55 / 1 min EF récup) + 10 min EF retour." },
    j3: { title: 'Sortie Longue EF', distance: '8.5 km', duration: '87 min', targetPace: 'EF : 10:15 min/km', mainSet: "87 min EF à 10:15 min/km. Allure constante, profite de la nature." },
  },
  8: { // S9 dev
    j1: { title: 'Fartlek doux progressif', distance: '6.0 km', duration: '58 min', targetPace: 'EF 10:15 / EA 8:55', mainSet: "58 min : 15 min EF + 8 × (30 s à EA 8:55 / 1 min EF récup) + 10 min EF retour. Si genou silencieux : ok. Si tiraillement : STOP." },
    j3: { title: 'Sortie Longue EF', distance: '9.0 km', duration: '92 min', targetPace: 'EF : 10:15 min/km', mainSet: "92 min EF à 10:15 min/km. Ravitaillement glucides (gel ou compote) à 45 min." },
  },
  9: { // S10 récup
    j1: { title: 'Footing récup', distance: '5.0 km', duration: '51 min', targetPace: 'EF : 10:15 min/km', mainSet: "51 min EF à 10:15 min/km, allure douce. Décharge après bloc dev." },
    j3: { title: 'Sortie Longue EF', distance: '8.0 km', duration: '82 min', targetPace: 'EF : 10:15 min/km', mainSet: "82 min EF à 10:15 min/km, terrain plat et roulant." },
  },
  10: { // S11 spé
    j1: { title: 'Allure spé semi — intro', distance: '6.5 km', duration: '63 min', targetPace: 'EF 10:15 / Spé semi 7:07', mainSet: "63 min : 15 min EF (10:15) + 2 × 6 min à allure spé semi (7:07 min/km), récup 3 min EF entre les blocs + 10 min EF retour. ATTENTION : 7:07 = 8,4 km/h, proche de ton seuil 9 km/h. STOP si douleur." },
    j3: { title: 'Sortie Longue EF', distance: '10.5 km', duration: '108 min', targetPace: 'EF : 10:15 min/km', mainSet: "108 min EF à 10:15 min/km. Travail volume aérobie. Ravitaillement à 45 min et 75 min." },
  },
  11: { // S12 spé
    j1: { title: 'Seuil court', distance: '7.0 km', duration: '67 min', targetPace: 'EF 10:15 / Seuil 7:54', mainSet: "67 min : 15 min EF + 3 × 5 min au seuil (7:54 min/km, sensation contrôlée mais inconfortable), récup 2 min EF entre + 10 min EF retour." },
    j3: { title: 'SL + allure spé semi', distance: '11.5 km', duration: '117 min', targetPace: 'EF 10:15 / Spé semi 7:07', mainSet: "117 min : 75 min EF (10:15) + 2 × 10 min à allure spé semi (7:07), récup 5 min EF entre + 7 min EF retour. STOP si douleur genou." },
  },
  12: { // S13 récup
    j1: { title: 'Footing récup', distance: '6.0 km', duration: '61 min', targetPace: 'EF : 10:15 min/km', mainSet: "61 min EF à 10:15 min/km, allure très douce. Décharge avant le bloc spé final." },
    j3: { title: 'Sortie Longue calme', distance: '9.5 km', duration: '97 min', targetPace: 'EF : 10:15 min/km', mainSet: "97 min EF à 10:15 min/km. Volume aérobie sans intensité." },
  },
  13: { // S14 spé
    j1: { title: 'Seuil', distance: '7.5 km', duration: '72 min', targetPace: 'EF 10:15 / Seuil 7:54', mainSet: "72 min : 15 min EF + 4 × 5 min au seuil (7:54), récup 2 min EF entre + 12 min EF retour." },
    j3: { title: 'SL + allure spé semi', distance: '12.0 km', duration: '122 min', targetPace: 'EF 10:15 / Spé semi 7:07', mainSet: "122 min : 60 min EF + 3 × 10 min à allure spé semi (7:07), récup 5 min EF entre + 17 min EF retour. La séance la plus spécifique du plan. STOP si tiraillement." },
  },
  14: { // S15 PIC
    j1: { title: 'Allure spé semi — bloc fort', distance: '8.0 km', duration: '77 min', targetPace: 'EF 10:15 / Spé semi 7:07', mainSet: "77 min : 15 min EF + 3 × 10 min à allure spé semi (7:07), récup 4 min EF entre + 10 min EF retour. Confirmation de l'allure cible." },
    j3: { title: 'Sortie Longue avec finish allure semi', distance: '12.0 km', duration: '122 min', targetPace: 'EF 10:15 / Spé semi 7:07', mainSet: "122 min : 80 min EF (10:15) + 4 km en continu à allure spé semi (7:07) + 5 min EF retour. Dernière SL volumineuse avant affûtage." },
  },
  15: { // S16 affûtage
    j1: { title: 'Allure spé semi — entretien', distance: '6.0 km', duration: '58 min', targetPace: 'EF 10:15 / Spé semi 7:07', mainSet: "58 min : 15 min EF + 2 × 8 min à allure spé semi (7:07), récup 4 min EF entre + 10 min EF retour. Maintien intensité, volume réduit." },
    j3: { title: 'Sortie Longue d\'affûtage', distance: '10.0 km', duration: '103 min', targetPace: 'EF : 10:15 min/km', mainSet: "103 min EF à 10:15 min/km. Dernière SL longue, allure facile, plaisir." },
  },
  16: { // S17 race week
    j1: { title: 'Activation — rappel allure', distance: '4.0 km', duration: '40 min', targetPace: 'EF 10:15 / Spé semi 7:07', mainSet: "40 min : 25 min EF + 4 × 1 min à allure spé semi (7:07), récup 2 min EF entre + 5 min EF retour. Réveil sans fatigue, J-5 ou J-4 avant la course." },
    j3: { title: '🏁 SEMI-MARATHON NANCY — JOUR J', distance: '21.1 km', duration: '2h30', targetPace: 'Allure spé semi 7:07 min/km (objectif 2h30)', mainSet: "21,1 km en compétition. Objectif déclaré : 2h30 (allure 7:07 min/km). Pacing sage : démarrage 30 s plus lent que cible sur les 5 premiers km, accélération progressive si sensations bonnes, finish libre. Hydratation tous les ravitaillements. EN CAS DE DOULEUR GENOU : arrêt immédiat, marcher jusqu'à la ligne ou abandon, médecin." },
  },
};

// Apply patches to weeks
const newWeeks = weeks.map((w, idx) => {
  if (idx === 0) return w; // S1 INTOUCHÉE
  const patch = SESSION_PATCHES[idx];
  if (!patch) return w;
  const newSessions = (w.sessions || []).map((s, j) => {
    if (s.type === 'Renforcement') return s; // RENFO INTOUCHÉ
    // Map by position : index 0 = j1, dernière séance = j3
    const isFirst = j === 0;
    const isLast = j === w.sessions.length - 1;
    if (isFirst && patch.j1) {
      return { ...s, ...patch.j1, type: getType(patch.j1.title) };
    }
    if (isLast && patch.j3) {
      return { ...s, ...patch.j3, type: getType(patch.j3.title) };
    }
    return s;
  });
  return { ...w, sessions: newSessions };
});

function getType(title) {
  if (title.includes('SEMI-MARATHON')) return 'Course';
  if (title.toLowerCase().includes('sortie longue') || title.toLowerCase().includes('sl ')) return 'Sortie Longue';
  if (title.toLowerCase().includes('seuil')) return 'Seuil';
  if (title.toLowerCase().includes('allure spé') || title.toLowerCase().includes('spé semi') || title.toLowerCase().includes('allure semi')) return 'Allure Spécifique';
  if (title.toLowerCase().includes('fartlek')) return 'Fractionné';
  if (title.toLowerCase().includes('activation') || title.toLowerCase().includes('rappel')) return 'Allure Spécifique';
  return 'Jogging';
}

// Build update payload
const updates = {
  welcomeMessage: NEW_WELCOME,
  feasibility: { ...plan.feasibility, status: 'TRÈS RISQUÉ', message: NEW_FEASIBILITY_MSG },
  weeks: newWeeks,
};

// Also update weeklyVolumes inside generationContext.periodizationPlan
if (plan.generationContext?.periodizationPlan) {
  updates.generationContext = {
    ...plan.generationContext,
    periodizationPlan: {
      ...plan.generationContext.periodizationPlan,
      weeklyVolumes: NEW_WEEKLY_VOLUMES,
    },
  };
}

// Verify race day session new state
const raceWeek = newWeeks[newWeeks.length - 1];
const raceSession = raceWeek.sessions[raceWeek.sessions.length - 1];
console.log('\n🏁 SÉANCE JOUR J APRÈS PATCH :');
console.log(`   type: ${raceSession.type} | title: ${raceSession.title}`);
console.log(`   distance: ${raceSession.distance} ${raceSession.distance === '21.1 km' ? '✅' : '❌'}`);
console.log(`   duration: ${raceSession.duration}`);
console.log(`   pace: ${raceSession.targetPace}`);

console.log('\n📊 RÉSUMÉ PATCH :');
console.log(`   welcomeMessage : ${NEW_WELCOME.length} caractères`);
console.log(`   feasibility.status : ${plan.feasibility?.status} → TRÈS RISQUÉ`);
console.log(`   feasibility.message : ${NEW_FEASIBILITY_MSG.length} caractères`);
console.log(`   weeklyVolumes : ${JSON.stringify(NEW_WEEKLY_VOLUMES)}`);
console.log(`   sessions S2→S17 patched : 16 semaines × 2 séances = 32 séances (S1 + tous renfo intouchés)`);

if (DRY) {
  console.log('\n🛑 DRY-RUN — aucune modif Firestore. Lance sans --dry pour exec.');
  process.exit(0);
}

// PATCH Firestore
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
console.log('\n✅ PATCH APPLIQUÉ.');
console.log(`   updateTime : ${patchResult.updateTime}`);

// Re-fetch verif
const verifRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
const verifDoc = await verifRes.json();
const verifPlan = {};
for (const [k, v] of Object.entries(verifDoc.fields)) verifPlan[k] = parseFs(v);
const verifRaceWeek = verifPlan.weeks[verifPlan.weeks.length - 1];
const verifRaceSession = verifRaceWeek.sessions[verifRaceWeek.sessions.length - 1];
console.log('\n🔍 VÉRIFICATION POST-PATCH :');
console.log(`   feasibility.status : ${verifPlan.feasibility?.status}`);
console.log(`   weeklyVolumes : ${JSON.stringify(verifPlan.generationContext?.periodizationPlan?.weeklyVolumes)}`);
console.log(`   race day : type=${verifRaceSession.type} | distance=${verifRaceSession.distance} ${verifRaceSession.distance === '21.1 km' ? '✅' : '❌'}`);
console.log(`   S1 J1 (intouchée) : ${verifPlan.weeks[0].sessions[0].title} | dist=${verifPlan.weeks[0].sessions[0].distance}`);
console.log(`   S2 J1 (patché) : ${verifPlan.weeks[1].sessions[0].title} | dist=${verifPlan.weeks[1].sessions[0].distance}`);

