#!/usr/bin/env node
/**
 * patch-julien2-restore-safeguards-27mai.mjs
 *
 * Restore + safeguards Julien plan #2 (1779892027140).
 * Audit FFA challenge intégré : VMA 9.4 (compromis), weeklyVolumes 21 sem
 * pic 32 avec S1=8 (cv 15 respecté), marche/course S1, retrait vallonné Dim,
 * welcomeMessage adapté profil #2 (pas copier-coller plan #1).
 *
 * Doctrines : D1 (objectif chrono Finisher intouché, allure EF dérivée modifiée),
 * D17, D18b, input_client_obligatoire (cv 15 respecté), startdate_input_strict
 * (01/06 conservée), jamais_poids_minceur, jamais_contact_client.
 *
 * Usage :
 *   DRY  : node patch-julien2-restore-safeguards-27mai.mjs
 *   EXEC : DRY_RUN=false node patch-julien2-restore-safeguards-27mai.mjs
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const PLAN_ID = '1779892027140';
const EXPECTED_EMAIL = 'desbonnet.julien@gmail.com';
const ORIGINAL_USER_ID = 'tyJB9FYzhbdKhTyl8rn1l3rAgCI2';
const DRY_RUN = process.env.DRY_RUN !== 'false';
const BACKUP_DIR = `/Users/romanemarino/Coach-Running-IA/audit-3prem-27mai-soir/backups-julien2-restore-${Date.now()}`;
mkdirSync(BACKUP_DIR, { recursive: true });

const docUrl = `https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/${PLAN_ID}`;
const token = () => execSync('gcloud auth print-access-token').toString().trim();
const fetchDoc = () => JSON.parse(execSync(`curl -s -H "Authorization: Bearer ${token()}" "${docUrl}"`, { maxBuffer: 80*1024*1024 }).toString());

// ──────────────────────────────────────────────
// Wording validé Romane + FFA challenge §2.5
// ──────────────────────────────────────────────
const NEW_WELCOME = `Salut Julien,

Bienvenue. J'ai retravaillé ton plan avec un coach spécialisé débutants/senior+ après avoir vu ton parcours. Avant qu'on démarre, je te dois la vérité.

Tu as ajusté quelques infos depuis ta première inscription : c'est ton droit le plus strict, et je prends ces nouveaux chiffres au sérieux. Mais que tu sois à 7 ou à 15 km/semaine actuellement, viser un premier marathon dans 5 mois reste un projet à risque tendineux et articulaire élevé. Les chocs traumatiques répétés sur des tendons et articulations non préparés sont la première cause de blessure dans ce type de configuration.

Ma recommandation honnête, en deux options plus sûres :
1. Basculer sur un semi-marathon le 25/10 (même date, même médaille, projet solide et atteignable).
2. Décaler ton marathon à 2027 pour te construire un socle propre sur 18 mois.

C'est ce que je conseillerais à un proche.

Si malgré tout tu veux maintenir ton marathon le 25/10 : on va te préparer au mieux possible, mais la performance le jour J n'est pas garantie. L'objectif numéro 1 reste d'arriver à la ligne d'arrivée intact, pas chrono.

Avant la première séance : test d'effort chez ton médecin. Non négociable pour un premier marathon dans ce contexte.

Les 6 premières semaines, on alterne marche et course (3 min course / 2 min marche) sur toutes les sorties. C'est la seule méthode validée pour absorber progressivement les chocs.

Le plan est marqué RISQUÉ avec un score bas : on avance les yeux ouverts. À la moindre douleur qui persiste 48h → tu stoppes et tu consultes un kiné du sport.

Romane et moi sommes là. Bon vent.`;

const NEW_SAFETY = `À lire avant de démarrer. Avec ton volume actuel et un premier marathon dans 5 mois, c'est un projet ambitieux qui demande des précautions non négociables.

Avant toute séance : test d'effort chez ton médecin. Pour un premier marathon dans ce contexte, ce n'est pas une option, c'est la base.

Les 6 premières semaines : alternance marche/course (3 min course / 2 min marche) sur toutes les sorties. Pas de footing continu avant qu'on en ait parlé.

Les 3 règles d'or — j'arrête et je consulte si :
1. Douleur articulaire ou tendineuse qui persiste après 48h de repos (genou, Achille, tibia, hanche).
2. Essoufflement anormal, oppression thoracique ou palpitations à l'effort modéré.
3. Fatigue qui dure plus de 72h après une séance, ou sommeil perturbé plusieurs nuits.

Le plan reste un guide, pas un ordre. Ton corps a toujours raison.`;

const NEW_FEAS_MESSAGE = `Marathon en 5 mois depuis un volume actuel faible reste un projet à risque tendineux élevé malgré nos ajustements. Pic d'entraînement remonté à 32 km/sem (3 sem avant la course) — au-dessus de ton volume actuel mais en dessous du référentiel marathon débutant (40-50 km/sem). On prépare au mieux possible, mais la réussite n'est pas garantie : la priorité reste d'arriver intact à la ligne d'arrivée. Test d'effort médical obligatoire avant de démarrer. Alternance marche/course les 6 premières semaines pour préserver les tendons.`;

const NEW_FEAS_RECO = `Un semi-marathon le 25/10 comme première expérience longue distance reste l'option la plus sûre. Marathon possible mais sous conditions strictes : avis médical favorable + signalement immédiat de toute douleur + alternance marche/course les 6 premières semaines.`;

// weeklyVolumes ré-étalés 21 sem (FFA §2.1) — S1=8 (cv 15 respecté), pic 32 (S20)
const NEW_VOLUMES = [8, 9, 10, 9, 11, 12, 14, 15, 17, 16, 19, 20, 18, 22, 24, 22, 26, 28, 26, 32, 22];

// ──────────────────────────────────────────────
console.log(`>>> Restore + Safeguards Julien #2 — DRY_RUN=${DRY_RUN}`);
const doc = fetchDoc();
writeFileSync(`${BACKUP_DIR}/${PLAN_ID}-before.json`, JSON.stringify(doc, null, 2));
const f = doc.fields;
if (f.userEmail?.stringValue !== EXPECTED_EMAIL) throw new Error('Email mismatch');

// 1. Restore userId
f.userId = { stringValue: ORIGINAL_USER_ID };

// 2. welcomeMessage
f.welcomeMessage = { stringValue: NEW_WELCOME };

// 3. feasibility complet
f.feasibility = { mapValue: { fields: {
  status: { stringValue: 'RISQUÉ' },
  score: { integerValue: 32 },
  message: { stringValue: NEW_FEAS_MESSAGE },
  safetyWarning: { stringValue: NEW_SAFETY },
  recommendation: { stringValue: NEW_FEAS_RECO },
  requiresMedicalClearance: { booleanValue: true },
}}};

// 4. weeklyVolumes
const gc = f.generationContext?.mapValue?.fields;
if (gc?.periodizationPlan?.mapValue?.fields?.weeklyVolumes) {
  gc.periodizationPlan.mapValue.fields.weeklyVolumes = {
    arrayValue: { values: NEW_VOLUMES.map(n => ({ integerValue: n })) }
  };
  console.log(`weeklyVolumes : pic ${Math.max(...NEW_VOLUMES)} (S${NEW_VOLUMES.indexOf(Math.max(...NEW_VOLUMES))+1}), S1=${NEW_VOLUMES[0]}`);
}

// 5. S1 sessions — marche/course Lundi + SL Vendredi + retrait vallonné Dimanche
//    VMA recalibrée 9.4 → allure EF 9:30/km (au lieu de 9:16/km actuel)
const weeks = f.weeks?.arrayValue?.values || [];
if (weeks.length > 0) {
  const sessions = weeks[0].mapValue.fields.sessions.arrayValue.values;
  for (const s of sessions) {
    const sf = s.mapValue.fields;
    const day = sf.day?.stringValue;
    const type = sf.type?.stringValue;
    if (day === 'Lundi' && type === 'Jogging') {
      sf.duration = { stringValue: '50 min' };
      sf.distance = { stringValue: '5 km' };
      sf.mainSet = { stringValue: '10 cycles en alternance marche/course : 3 min de course en endurance fondamentale (allure cible 9:30 min/km, calibrée sur VMA 9.4) puis 2 min de marche active. Ce format est obligatoire les 6 premières semaines pour préserver tes tendons. Distance 5 km en plat-équivalent.' };
      sf.coachAdvice = { stringValue: 'Échauffement marche 5 min avant le premier cycle. Si tu ressens une douleur articulaire ou tendineuse pendant la séance, tu raccourcis et tu signales via Romane.' };
      console.log('S1 Lundi : 5 blocs 5C/1M → 10 cycles 3C-2M @ 9:30/km, 50 min, 5 km plat');
    }
    if (day === 'Vendredi' && type === 'Sortie Longue') {
      sf.duration = { stringValue: '45 min' };
      sf.distance = { stringValue: '4.5 km' };
      sf.mainSet = { stringValue: '9 cycles en alternance marche/course : 3 min de course en endurance fondamentale (allure cible 9:30 min/km) puis 2 min de marche active. Distance 4.5 km en plat-équivalent. C\'est l\'effort progressif qui compte, pas la vitesse.' };
      sf.coachAdvice = { stringValue: 'Sortie longue version douce S1. Si tu sens des tensions au-delà de 3/10, tu raccourcis. Hydrate-toi avant/pendant/après.' };
      console.log('S1 Vendredi SL : 60min continu/6.4km → 45 min/9 cycles 3C-2M/4.5 km plat');
    }
    if (day === 'Dimanche' && type === 'Jogging') {
      sf.duration = { stringValue: '25 min' };
      sf.distance = { stringValue: '2.5 km' };
      sf.mainSet = { stringValue: '5 cycles en alternance marche/course : 3 min de course en endurance fondamentale (allure cible 9:30 min/km) puis 2 min de marche active. Distance 2.5 km en plat-équivalent. Terrain PLAT obligatoire S1-S6 (retrait du dénivelé).' };
      sf.coachAdvice = { stringValue: 'Footing très court de récupération active sur terrain plat. Si fatigue ou tension, tu remplaces par 25 min de marche pure et tu préviens Romane.' };
      console.log('S1 Dimanche : 38 min vallonné/4.1 km → 25 min/5 cycles 3C-2M/2.5 km PLAT (retrait dénivelé)');
    }
    // Mercredi Renforcement : inchangé (FFA GO §11)
  }
}

// 6. Cleanup paused fields
const finalFields = { ...f, _pausedAt: { nullValue: null }, _pausedReason: { nullValue: null }, _originalUserId: { nullValue: null } };

const mask = ['userId', 'welcomeMessage', 'feasibility', 'generationContext', 'weeks', '_pausedAt', '_pausedReason', '_originalUserId'];

if (DRY_RUN) {
  writeFileSync(`${BACKUP_DIR}/${PLAN_ID}-proposed.json`, JSON.stringify({ fields: finalFields }, null, 2));
  console.log(`\nDRY RUN OK. Pour exec : DRY_RUN=false node patch-julien2-restore-safeguards-27mai.mjs`);
  console.log(`Proposed dump : ${BACKUP_DIR}/${PLAN_ID}-proposed.json`);
} else {
  const url = `${docUrl}?${mask.map(p => `updateMask.fieldPaths=${p}`).join('&')}`;
  const tmp = `/tmp/patch-julien2-restore-${Date.now()}.json`;
  writeFileSync(tmp, JSON.stringify({ fields: finalFields }));
  const res = JSON.parse(execSync(`curl -s -X PATCH -H "Authorization: Bearer ${token()}" -H "Content-Type: application/json" --data-binary @${tmp} "${url}"`, { maxBuffer: 80*1024*1024 }).toString());
  if (res.error) { console.error(res.error.message); process.exit(1); }
  console.log(`\n✅ PATCH OK -> updateTime: ${res.updateTime}`);
  console.log(`🟢 Julien #2 accessible via URL, plan #2 sécurisé`);
}
