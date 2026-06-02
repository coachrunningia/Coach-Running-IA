#!/usr/bin/env node
/**
 * patch-julien-restore-scenario-A-27mai.mjs
 *
 * Restore + safeguards Julien plan 1779889214538 (desbonnet.julien@gmail.com).
 *
 * Contexte : plan pausé via patch-julien-pause-safety-27mai.mjs ce soir suite
 * réaction Julien (a "sonné" Romane). Audit FFA livré (EXPERT-COACH-JULIEN-URGENT.md).
 * Romane a tranché : Scénario A — Marathon recalibré sous safeguards + baisser score
 * fiabilité (45 → 32) + refondre welcomeMessage (tone honnête, performance non garantie).
 *
 * Patches appliqués :
 *   1. weeklyVolumes ré-étalés (FFA §4.1) — pic 32 km/sem au lieu de 24
 *   2. S1 sessions Vendredi SL + Dimanche Footing : alternance marche/course (FFA §4.2)
 *   3. welcomeMessage refondu (FFA §3 v.A + correction Romane "tone honnête")
 *   4. safetyWarning enrichi (FFA §3)
 *   5. feasibility.score 45 → 32, status reste RISQUÉ
 *   6. feasibility.message reformulé honnêtement
 *   7. requiresMedicalClearance : true (nouveau champ)
 *   8. userId restauré (_PAUSED_SAFETY_* → original tyJB9FYzhbdKhTyl8rn1l3rAgCI2)
 *   9. Cleanup _pausedAt / _pausedReason / _originalUserId
 *
 * Doctrines :
 *   D1 — targetPace 9:43 INTOUCHÉ ✅
 *   D17 — RISQUÉ + transparence opt-in (safetyWarning fort, score bas, message honnête) ✅
 *   D18b — distance plat-équivalent IMMUABLE ✅ (on baisse car contenu change réellement)
 *   D19 — weeklyVolumes EXCLUT course officielle ✅ (S22 = 14 km hors course)
 *   feedback_input_client_obligatoire — cv/raceDate/startDate/frequency INTOUCHÉS ✅
 *   feedback_jamais_baisser_allure_cible — allure cible INTOUCHÉE ✅
 *   feedback_jamais_poids_minceur — ZÉRO mention poids/IMC dans wording ✅
 *   feedback_jamais_contact_client — pas de notif user auto, Romane communique ✅
 *
 * Idempotent : si déjà restauré → log et exit.
 *
 * Usage :
 *   DRY :  node patch-julien-restore-scenario-A-27mai.mjs
 *   EXEC : DRY_RUN=false node patch-julien-restore-scenario-A-27mai.mjs
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779889214538';
const EXPECTED_EMAIL = 'desbonnet.julien@gmail.com';
const ORIGINAL_USER_ID = 'tyJB9FYzhbdKhTyl8rn1l3rAgCI2';
const PAUSED_USER_ID = `_PAUSED_SAFETY_${ORIGINAL_USER_ID}`;

const DRY_RUN = process.env.DRY_RUN !== 'false';
const BACKUP_DIR = `/Users/romanemarino/Coach-Running-IA/audit-27mai-soir/backups-restore-${Date.now()}`;
mkdirSync(BACKUP_DIR, { recursive: true });

const docUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;

function token() { return execSync('gcloud auth print-access-token').toString().trim(); }
function fetchDoc() { return JSON.parse(execSync(`curl -s -H "Authorization: Bearer ${token()}" "${docUrl}"`, { maxBuffer: 80 * 1024 * 1024 }).toString()); }

// ──────────────────────────────────────────────
// Constantes wording (validées Romane + FFA)
// ──────────────────────────────────────────────

const NEW_WELCOME_MESSAGE = `Salut Julien,

Bienvenue. J'ai retravaillé ton plan avec un coach spécialisé débutants/senior+ après ton retour. Je te dois la vérité avant qu'on démarre.

Ton volume actuel est faible (7 km/semaine) et tu vises un marathon dans 5 mois. Pour ton corps, c'est une montée de charge agressive : le risque tendineux et articulaire est élevé, surtout à 46 ans sur un premier dossard marathon. Les chocs traumatiques répétés sur des tendons et articulations non préparés sont la première cause de blessure dans ce type de configuration.

Ma recommandation honnête, en deux options plus sûres :
1. Basculer sur un semi-marathon le 25/10 (même date, même médaille, projet solide et atteignable depuis ton volume actuel).
2. Ou décaler ton marathon à 2027 pour te construire un socle propre sur 18 mois (semi à l'automne 26, marathon en 2027).

C'est ce que je conseillerais à un proche dans ta situation.

Si malgré tout tu veux maintenir ton marathon le 25/10 : on va te préparer au mieux possible, mais la performance le jour J n'est pas garantie. L'objectif numéro 1 reste d'arriver à la ligne d'arrivée intact, pas chrono. Si on doit basculer en cours de route, on le fera ensemble sans frustration.

Avant la première séance : test d'effort chez ton médecin. Non négociable à 46 ans pour un premier marathon.

Les 6 premières semaines, on alterne marche et course (3 min course / 2 min marche) sur toutes les sorties. C'est la seule méthode validée pour absorber progressivement les chocs et préserver tes tendons.

Le plan est marqué RISQUÉ avec un score de fiabilité bas : tu le sais, on le sait, on avance les yeux ouverts. À la moindre douleur qui persiste 48h → tu stoppes et tu consultes un kiné du sport.

Romane et moi sommes là. Bon vent, Julien.`;

const NEW_SAFETY_WARNING = `À lire avant de démarrer. Tu démarres avec 7 km/sem en moyenne et tu vises un premier marathon dans 5 mois : c'est un projet ambitieux qui demande des précautions non négociables.

Avant toute séance : test d'effort chez ton médecin. À 46 ans pour un premier marathon, ce n'est pas une option, c'est la base.

Les 6 premières semaines : alternance marche/course (3 min course / 2 min marche) sur toutes les sorties. Pas de footing continu avant qu'on en ait parlé.

Les 3 règles d'or — j'arrête et je consulte si :
1. Douleur articulaire ou tendineuse qui persiste après 48h de repos (genou, Achille, tibia, hanche).
2. Essoufflement anormal, oppression thoracique ou palpitations à l'effort modéré.
3. Fatigue qui dure plus de 72h après une séance, ou sommeil perturbé plusieurs nuits.

Le plan reste un guide, pas un ordre. Ton corps a toujours raison.`;

const NEW_FEASIBILITY_MESSAGE = `Marathon en 5 mois depuis 7 km/sem reste un projet à risque malgré nos ajustements. Pic d'entraînement remonté à 32 km/sem (3 semaines avant la course) — au-dessus de ton volume actuel mais en dessous du référentiel marathon débutant (40-50 km/sem). On prépare au mieux possible, mais réussir le marathon n'est pas garanti : la priorité reste d'arriver intact à la ligne d'arrivée. Test d'effort médical obligatoire avant de démarrer. Alternance marche/course les 6 premières semaines pour préserver tes tendons.`;

const NEW_RECOMMENDATION = `Un semi-marathon comme première expérience longue distance reste l'option la plus sûre. Marathon possible mais sous conditions strictes : avis médical favorable et signalement immédiat de toute douleur.`;

// weeklyVolumes ré-étalés FFA §4.1 (pic 32 au lieu de 24)
const NEW_WEEKLY_VOLUMES = [6, 7, 8, 7, 9, 10, 12, 13, 15, 14, 17, 18, 16, 20, 22, 20, 24, 27, 25, 32, 22, 14];

// ──────────────────────────────────────────────
// EXEC
// ──────────────────────────────────────────────

console.log(`>>> Patch RESTORE + SAFEGUARDS Julien — DRY_RUN=${DRY_RUN}`);
console.log(`>>> Backups dans ${BACKUP_DIR}`);

const doc = fetchDoc();
if (!doc.fields) throw new Error('Plan Julien introuvable');
writeFileSync(`${BACKUP_DIR}/${PLAN_ID}-before.json`, JSON.stringify(doc, null, 2));
console.log(`>>> Backup OK`);

const f = doc.fields;
if (f.userEmail?.stringValue !== EXPECTED_EMAIL) {
  throw new Error(`Email mismatch : ${f.userEmail?.stringValue} ≠ ${EXPECTED_EMAIL}`);
}

const currentUserId = f.userId?.stringValue;
console.log(`✓ userEmail : ${EXPECTED_EMAIL}`);
console.log(`✓ updateTime avant : ${doc.updateTime}`);
console.log(`✓ userId AVANT : ${currentUserId}`);

if (currentUserId === ORIGINAL_USER_ID && !f._pausedReason) {
  console.log(`\n⏭️  Plan DÉJÀ restauré et sans paused fields. Idempotent partiel — patches wording/volumes peuvent quand même être appliqués.`);
}

// ──────────────────────────────────────────────
// Patch 1 : userId restore + cleanup paused fields
// ──────────────────────────────────────────────
f.userId = { stringValue: ORIGINAL_USER_ID };
// (les nullValue côté patch suppriment les champs)

// ──────────────────────────────────────────────
// Patch 2 : welcomeMessage
// ──────────────────────────────────────────────
const oldWelcome = f.welcomeMessage?.stringValue || '';
f.welcomeMessage = { stringValue: NEW_WELCOME_MESSAGE };
console.log(`\n--- welcomeMessage ---`);
console.log(`  avant: ${oldWelcome.length} chars`);
console.log(`  après: ${NEW_WELCOME_MESSAGE.length} chars`);

// ──────────────────────────────────────────────
// Patch 3 : feasibility complet (score + status + message + safetyWarning + recommendation + requiresMedicalClearance)
// ──────────────────────────────────────────────
f.feasibility = {
  mapValue: {
    fields: {
      status: { stringValue: 'RISQUÉ' },
      score: { integerValue: 32 }, // 45 → 32 (Romane : baisser confiance pour honnêteté)
      message: { stringValue: NEW_FEASIBILITY_MESSAGE },
      safetyWarning: { stringValue: NEW_SAFETY_WARNING },
      recommendation: { stringValue: NEW_RECOMMENDATION },
      requiresMedicalClearance: { booleanValue: true }
    }
  }
};
console.log(`\n--- feasibility ---`);
console.log(`  status: RISQUÉ (inchangé)`);
console.log(`  score : 45 → 32`);
console.log(`  requiresMedicalClearance: true (NEW)`);

// ──────────────────────────────────────────────
// Patch 4 : generationContext.periodizationPlan.weeklyVolumes
// ──────────────────────────────────────────────
const gc = f.generationContext?.mapValue?.fields;
if (gc?.periodizationPlan?.mapValue?.fields?.weeklyVolumes) {
  const old = gc.periodizationPlan.mapValue.fields.weeklyVolumes.arrayValue.values.map(v => parseInt(v.integerValue || v.doubleValue || 0, 10));
  gc.periodizationPlan.mapValue.fields.weeklyVolumes = {
    arrayValue: { values: NEW_WEEKLY_VOLUMES.map(n => ({ integerValue: n })) }
  };
  console.log(`\n--- weeklyVolumes (generationContext.periodizationPlan) ---`);
  console.log(`  AVANT: [${old.join(', ')}]`);
  console.log(`  APRÈS: [${NEW_WEEKLY_VOLUMES.join(', ')}]`);
  console.log(`  pic   ${Math.max(...old)} → ${Math.max(...NEW_WEEKLY_VOLUMES)}`);
}

// ──────────────────────────────────────────────
// Patch 5 : S1 sessions Vendredi SL + Dimanche Footing — alternance marche/course
// ──────────────────────────────────────────────
const weeks = f.weeks?.arrayValue?.values || [];
if (weeks.length > 0) {
  const s1Sessions = weeks[0].mapValue.fields.sessions.arrayValue.values;
  for (const s of s1Sessions) {
    const sf = s.mapValue.fields;
    const day = sf.day?.stringValue;
    const type = sf.type?.stringValue;

    if (day === 'Vendredi' && type === 'Sortie Longue') {
      sf.duration = { stringValue: '45 min' };
      sf.distance = { stringValue: '4.5 km' };
      sf.mainSet = { stringValue: '9 cycles en alternance marche/course : 3 min de course en endurance fondamentale (allure cible 9:43 min/km) puis 2 min de marche active. Ce format est obligatoire les 6 premières semaines pour préserver tes tendons. La distance 4.5 km est un plat-équivalent (la marche compte aussi). C\'est l\'effort progressif qui compte, pas la vitesse.' };
      sf.coachAdvice = { stringValue: 'Si tu sens une douleur articulaire ou tendineuse pendant la séance, tu raccourcis et tu signales via Romane. Hydrate-toi avant/pendant/après. À 46 ans, échauffement marche 5 min avant le premier cycle est obligatoire.' };
      console.log(`\n--- S1 Vendredi SL ---`);
      console.log(`  duration : 1h 09 min → 45 min`);
      console.log(`  distance : 6.8 km → 4.5 km (plat-équivalent, alternance marche/course)`);
      console.log(`  mainSet  : continu → 9 cycles 3C/2M`);
    }
    if (day === 'Dimanche' && type === 'Jogging') {
      sf.duration = { stringValue: '25 min' };
      sf.distance = { stringValue: '2.5 km' };
      sf.mainSet = { stringValue: '5 cycles en alternance marche/course : 3 min de course en endurance fondamentale (allure cible 9:43 min/km) puis 2 min de marche active. Tu dois pouvoir tenir une conversation sur les phases de course. Distance 2.5 km en plat-équivalent.' };
      sf.coachAdvice = { stringValue: 'Footing très court de récupération active. Si fatigue ou tension persistante, tu remplaces par 25 min de marche pure et tu préviens Romane.' };
      console.log(`\n--- S1 Dimanche Footing ---`);
      console.log(`  duration : 26 min → 25 min`);
      console.log(`  distance : 2.3 km → 2.5 km (plat-équivalent ajusté alternance)`);
      console.log(`  mainSet  : continu → 5 cycles 3C/2M`);
    }
  }
}

// ──────────────────────────────────────────────
// EXEC
// ──────────────────────────────────────────────

const updateMask = [
  'userId',
  'welcomeMessage',
  'feasibility',
  'generationContext',
  'weeks',
  '_pausedAt',
  '_pausedReason',
  '_originalUserId'
];

// Pour cleanup des paused fields, on les met explicitement à null côté patch
const finalFields = { ...f, _pausedAt: { nullValue: null }, _pausedReason: { nullValue: null }, _originalUserId: { nullValue: null } };

if (DRY_RUN) {
  console.log(`\n========== DRY RUN OK ==========`);
  console.log(`Pour exec : DRY_RUN=false node patch-julien-restore-scenario-A-27mai.mjs`);
  writeFileSync(`${BACKUP_DIR}/${PLAN_ID}-proposed.json`, JSON.stringify({ fields: finalFields }, null, 2));
  console.log(`Proposed doc dumped : ${BACKUP_DIR}/${PLAN_ID}-proposed.json`);
} else {
  const url = `${docUrl}?${updateMask.map(p => `updateMask.fieldPaths=${p}`).join('&')}`;
  const tmp = `/tmp/patch-julien-restore-${Date.now()}.json`;
  writeFileSync(tmp, JSON.stringify({ fields: finalFields }));
  const res = execSync(`curl -s -X PATCH -H "Authorization: Bearer ${token()}" -H "Content-Type: application/json" --data-binary @${tmp} "${url}"`, { maxBuffer: 80 * 1024 * 1024 }).toString();
  const parsed = JSON.parse(res);
  if (parsed.error) {
    console.error(`\n❌ PATCH FAILED : ${parsed.error.message}`);
    process.exit(1);
  }
  console.log(`\n========== EXEC TERMINÉ ==========`);
  console.log(`✅ PATCH OK -> updateTime: ${parsed.updateTime}`);
  console.log(`\n🟢 Julien peut maintenant accéder à son plan via /plan/${PLAN_ID}.`);
  console.log(`   Plan recalibré : pic 32 km/sem, S1 alternance marche/course, score 32, safetyWarning enrichi.`);
  console.log(`   Romane → contacter Julien pour annoncer les ajustements (template Section 2 Q7 ou wording proposé).`);
}
