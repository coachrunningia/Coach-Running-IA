/**
 * Correction Plan E — lamey.michel@gmail (1778669503908)
 *   1. Reconstruction complète de la S1 selon protocole récup post-ultra (sans cross-training)
 *   2. Renommer phase S1 : "fondamental" → "récupération"
 *   3. Renommer theme S1 : "fondamental" → "récupération post-course longue"
 *   4. Reformuler feasibility.message : volume estimé + check HRV/sommeil
 */
import { execSync } from 'child_process';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';
const PLAN_ID = '1778669503908';

// === 1. Read current state ===
const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const j = await r.json();
const weeks = j.fields.weeks.arrayValue.values;
const w1 = weeks[0].mapValue.fields;
const currentSessions = w1.sessions.arrayValue.values;
console.log(`S1 actuelle : ${currentSessions.length} séances`);
currentSessions.forEach((s, i) => {
  const f = s.mapValue.fields;
  console.log(`  ${i+1}. ${f.day.stringValue} | ${f.type.stringValue} | "${f.title.stringValue}" | ${f.duration.stringValue}`);
});

// === 2. Nouvelle S1 — 7 jours, sans cross-training ===
const ts = Date.now();
const rid = () => Math.random().toString(36).substring(2, 9);
const sessionId = (week, idx) => ({ stringValue: `w${week}-s${idx+1}-fix-${ts}-${rid()}` });

const newS1Sessions = [
  {
    mapValue: { fields: {
      day: { stringValue: 'Lundi' },
      type: { stringValue: 'Repos' },
      title: { stringValue: 'Repos complet' },
      duration: { stringValue: '0 min' },
      distance: { stringValue: '0 km' },
      elevationGain: { integerValue: 0 },
      intensity: { stringValue: 'Repos' },
      targetPace: { stringValue: 'N/A' },
      warmup: { stringValue: '' },
      mainSet: { stringValue: 'Repos total. Marche libre <30 min si envie, sans intention sportive.' },
      cooldown: { stringValue: '' },
      advice: { stringValue: 'Sommeil >8h. Hydratation + protéines (~1,6 g/kg) pour finaliser la réparation tissulaire post-ultra.' },
      id: sessionId(1, 0),
    }}
  },
  {
    mapValue: { fields: {
      day: { stringValue: 'Mardi' },
      type: { stringValue: 'Jogging' },
      title: { stringValue: 'Reprise EF prudente sur surface souple' },
      duration: { stringValue: '35 min' },
      distance: { stringValue: '5.5 km' },
      elevationGain: { integerValue: 30 },
      intensity: { stringValue: 'Facile' },
      targetPace: { stringValue: '6:45 min/km (EF)' },
      warmup: { stringValue: '5 min marche puis 5 min en aisance progressive.' },
      mainSet: { stringValue: '35 min EF continu sur chemin plat ou piste cendrée (allure 6:45/km, 60-65% VMA). Aucune accélération, foulée relâchée.' },
      cooldown: { stringValue: '5 min de marche + étirements doux mollets/quadriceps (sans forcer).' },
      advice: { stringValue: 'Si douleur tibiale >2/10 ou raideur asymétrique : on stoppe et on rallonge le repos. Surface souple obligatoire.' },
      id: sessionId(1, 1),
    }}
  },
  {
    mapValue: { fields: {
      day: { stringValue: 'Mercredi' },
      type: { stringValue: 'Renforcement' },
      title: { stringValue: 'Renfo iso bas du corps + gainage (S1)' },
      duration: { stringValue: '30 min' },
      distance: { stringValue: '0 km' },
      elevationGain: { integerValue: 0 },
      intensity: { stringValue: 'Modéré' },
      targetPace: { stringValue: 'N/A' },
      warmup: { stringValue: '8 min de mobilité articulaire (hanches, chevilles, dos) + activations fessiers.' },
      mainSet: { stringValue: 'Circuit 3 tours : Chaise au mur (3x45s), Pont fessier isométrique (3x40s), Gainage ventral (3x40s), Gainage latéral (2x30s/côté), Mollets soleus isométrique assis (3x45s). PAS de pliométrie, PAS d\'excentrique profond, PAS de saut.' },
      cooldown: { stringValue: '5 min étirements doux : mollets, ischio-jambiers, quadriceps, hanches.' },
      advice: { stringValue: 'Isométrie = stimulation tendineuse et osseuse sécurisée. Sécurise le tibia sans pic de contrainte.' },
      id: sessionId(1, 2),
    }}
  },
  {
    mapValue: { fields: {
      day: { stringValue: 'Jeudi' },
      type: { stringValue: 'Jogging' },
      title: { stringValue: 'EF plat - sensations' },
      duration: { stringValue: '40 min' },
      distance: { stringValue: '6.5 km' },
      elevationGain: { integerValue: 40 },
      intensity: { stringValue: 'Facile' },
      targetPace: { stringValue: '6:35 min/km (EF)' },
      warmup: { stringValue: '10 min marche + EF progressive.' },
      mainSet: { stringValue: '40 min continu en EF (6:35/km, 62-67% VMA) sur terrain souple. Si frais en fin de séance, 4x20s d\'accélérations de fréquence (cadence haute, pas de vitesse).' },
      cooldown: { stringValue: '5 min étirements + mobilité chevilles.' },
      advice: { stringValue: 'Surveille la cadence (≥170 ppm) pour limiter l\'impact tibial.' },
      id: sessionId(1, 3),
    }}
  },
  {
    mapValue: { fields: {
      day: { stringValue: 'Vendredi' },
      type: { stringValue: 'Repos' },
      title: { stringValue: 'Repos' },
      duration: { stringValue: '0 min' },
      distance: { stringValue: '0 km' },
      elevationGain: { integerValue: 0 },
      intensity: { stringValue: 'Repos' },
      targetPace: { stringValue: 'N/A' },
      warmup: { stringValue: '' },
      mainSet: { stringValue: 'Mobilité douce hanches/chevilles 10-15 min, auto-massages mollets/quadriceps.' },
      cooldown: { stringValue: '' },
      advice: { stringValue: 'Pas de course aujourd\'hui. La fenêtre osseuse a besoin de jours sans charge d\'impact pour récupérer.' },
      id: sessionId(1, 4),
    }}
  },
  {
    mapValue: { fields: {
      day: { stringValue: 'Samedi' },
      type: { stringValue: 'Jogging' },
      title: { stringValue: 'EF vallonné doux' },
      duration: { stringValue: '55 min' },
      distance: { stringValue: '8.5 km' },
      elevationGain: { integerValue: 180 },
      intensity: { stringValue: 'Facile' },
      targetPace: { stringValue: '6:30 min/km (EF)' },
      warmup: { stringValue: '10 min marche + EF souple.' },
      mainSet: { stringValue: '55 min EF sur sentier roulant (62-68% VMA, allure 6:30/km). Côtes ≤5% pente. Marche les descentes >5% si terrain l\'impose. Pas de relance ni fractionné.' },
      cooldown: { stringValue: '5 min marche + étirements mollets/ischios.' },
      advice: { stringValue: 'Descentes à pied lent = protocole anti-impact tibial, non négociable avec ton historique.' },
      id: sessionId(1, 5),
    }}
  },
  {
    mapValue: { fields: {
      day: { stringValue: 'Dimanche' },
      type: { stringValue: 'Sortie Longue' },
      title: { stringValue: 'SL courte de reprise' },
      duration: { stringValue: '1h 30 min' },
      distance: { stringValue: '13 km' },
      elevationGain: { integerValue: 250 },
      intensity: { stringValue: 'Facile' },
      targetPace: { stringValue: '6:50 min/km (EF)' },
      warmup: { stringValue: '10 min marche + EF très souple.' },
      mainSet: { stringValue: '1h30 continu sur sentier souple, dénivelé modéré progressif (≤5% pente). Allure 6:50/km (60-65% VMA). Test ravitaillement comme en course (nutrition/hydratation).' },
      cooldown: { stringValue: '10 min marche + étirements doux globaux.' },
      advice: { stringValue: 'Sortie d\'entretien, PAS de qualité. Si fatigue résiduelle de l\'ultra au km 8, coupe à 1h15. À 21 sem de l\'objectif, on a le temps.' },
      id: sessionId(1, 6),
    }}
  },
];

// === 3. Modifier la S1 : phase, theme, sessions ===
w1.theme = { stringValue: 'récupération post-course longue' };
w1.phase = { stringValue: 'récupération' };
w1.sessions = { arrayValue: { values: newS1Sessions } };

// === 4. Reformulation feasibility.message (estimation volume + check HRV/sommeil) ===
const currentMessage = j.fields.feasibility.mapValue.fields.message.stringValue;
console.log(`\nMessage actuel (${currentMessage.length} chars):\n${currentMessage}`);

let newMessage = currentMessage;
// Retirer la phrase volume actuel inventé
newMessage = newMessage.replace(
  /Volume actuel de \d+km\/sem (insuffisant|bas) pour un (trail|ultra) de \d+km \(\d+km\/sem\+? recommandés\)\.\s*/g,
  ''
);
// Estimation note + HRV check, insérée avant "Blessure déclarée"
const ESTIMATION_AND_HRV = "Tu n'as pas indiqué ton volume actuel — on part de l'estimation 40 km/sem (basée sur ton niveau Expert et fréquence 5sé/sem) : c'est bas pour un ultra de 105 km (50 km/sem+ recommandés). Si tu cours réellement plus, régénère ton plan en saisissant ton volume pour des recommandations adaptées. AVANT de démarrer la S1, vérifie que ta fréquence cardiaque de repos, ton sommeil et ta perception de fatigue sont revenus à la normale post-62km. Si non, repousse le début du plan de 7 à 14 jours. ";

if (newMessage.includes('Blessure déclarée')) {
  newMessage = newMessage.replace('Blessure déclarée', ESTIMATION_AND_HRV + 'Blessure déclarée');
} else {
  newMessage = newMessage.trim() + '\n\n' + ESTIMATION_AND_HRV.trim();
}
newMessage = newMessage.replace(/  +/g, ' ').replace(/\n\n+/g, '\n\n').trim();

console.log(`\nNouveau message (${newMessage.length} chars):\n${newMessage}`);

// === 5. PATCH ===
// On envoie weeks ET feasibility.message
const patchRes = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}?updateMask.fieldPaths=weeks&updateMask.fieldPaths=feasibility.message`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fields: {
      weeks: { arrayValue: { values: weeks } },
      feasibility: { mapValue: { fields: { message: { stringValue: newMessage } } } },
    }
  }),
});
const patched = await patchRes.json();
if (patched.error) { console.error('🔴 Erreur PATCH:', patched.error); process.exit(1); }

// === 6. Vérification ===
const r2 = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, { headers: { 'Authorization': `Bearer ${access_token}` } });
const j2 = await r2.json();
const w1after = j2.fields.weeks.arrayValue.values[0].mapValue.fields;
console.log(`\n--- Vérif post-patch S1 ---`);
console.log(`Phase : ${w1after.phase?.stringValue}`);
console.log(`Theme : ${w1after.theme?.stringValue}`);
w1after.sessions.arrayValue.values.forEach((s, i) => {
  const f = s.mapValue.fields;
  console.log(`  ${i+1}. ${f.day.stringValue.padEnd(10)} | ${f.type.stringValue.padEnd(15)} | "${f.title.stringValue}" | ${f.duration.stringValue} | ${f.distance.stringValue} | D+${f.elevationGain?.integerValue||0}m`);
});
console.log(`\n✅ Plan E corrigé : S1 récupération post-ultra (sans cross-training), phase renommée, message volume estimé + check HRV.`);
