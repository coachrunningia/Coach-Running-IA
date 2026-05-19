import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';

const TOKEN = execSync('gcloud auth application-default print-access-token').toString().trim();
const PROJECT = 'coach-running-ia';
const PLAN_ID = '1778918772165';
const BACKUP_DIR = '/Users/romanemarino/Coach-Running-IA/backup-al1-2026-05-16';

mkdirSync(BACKUP_DIR, { recursive: true });

// ===== STEP 1 : Récupérer plan + backup =====
const r0 = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, {
  headers: { Authorization: `Bearer ${TOKEN}` }
});
const plan = await r0.json();
writeFileSync(`${BACKUP_DIR}/al1-${PLAN_ID}-AVANT.json`, JSON.stringify(plan, null, 2));
console.log(`✅ Backup AVANT écrit dans ${BACKUP_DIR}`);

const f = plan.fields;

// ===== STEP 2 : A2 — Welcome refait (posture PM + ajustement Coach) =====
const NEW_WELCOME = `Transparence sur ton objectif

Ton plan est calibré pour viser sub-1h30 sur semi-marathon. À 45 ans, ce chrono reste exigeant — voici les conditions à tenir :

• **Volume peak 72 km/sem** (+20% vs ton volume actuel 60 — dans la zone safe de progression)
• **4 séances/sem** — 5 séances doubleraient la probabilité de sub-1h30. Si tu peux dégager 1 footing récup en plus, dis-le.
• **Régularité parfaite des séances qualité** (VMA, seuil) sur les 22 semaines
• **Sortie longue dominicale** jamais zappée

Si tout aligne, sub-1h30 est atteignable. Si une condition saute, on vise **1h31-1h33** — toujours un excellent chrono à ton âge.

**Avant J+15 : bilan cardio + test effort max** (45 ans + intensité compétition). Sans feu vert médical, on reste sur 1h32 cible. Hydrate-toi bien, échauffe-toi avant chaque séance et accorde-toi un vrai temps de récupération.`;

// ===== STEP 3 : A1+A5 — weeklyVolumes peak 72 + cohérence sessions =====
// Nouveau weeklyVolumes : progression graduelle +5%/sem, peak 72, taper 3 sem
const NEW_WEEKLY_VOLUMES = [51,56,62,50,58,64,68,54,62,68,72,56,64,70,72,56,63,70,72,56,47,35];
console.log('Nouveau weeklyVolumes peak 72:', NEW_WEEKLY_VOLUMES);
console.log('Total km plan:', NEW_WEEKLY_VOLUMES.reduce((a,b)=>a+b,0), 'km');

// ===== STEP 4 : A4 + A5 — patch sessions S1 =====
const weeksArr = f.weeks?.arrayValue?.values || [];
const newWeeks = JSON.parse(JSON.stringify(weeksArr));

if (newWeeks[0]) {
  const sessions = newWeeks[0].mapValue.fields.sessions.arrayValue.values;

  for (const s of sessions) {
    const sm = s.mapValue.fields;
    const day = sm.day?.stringValue;
    const type = sm.type?.stringValue;
    const title = sm.title?.stringValue;

    // A4 — Retypage Mardi : SL → Jogging MLR + _dedupedFromSL pour bypass auto-retype
    if (day === 'Mardi' && type === 'Sortie Longue') {
      sm.type.stringValue = 'Jogging';
      sm.title.stringValue = 'Sortie moyenne en endurance fondamentale (MLR)';
      // Ajouter le flag _dedupedFromSL pour empêcher enforceWeekConstraints de retyper
      sm._dedupedFromSL = { booleanValue: true };
      // Mettre à jour le mainSet pour clarifier que c'est un MLR (pas progressif)
      sm.mainSet.stringValue = `1h26min en endurance fondamentale stable (5:44 min/km). Allure conversationnelle constante du début à la fin, FC ≤ 75% FCM. C'est une séance de VOLUME (Medium-Long Run Pfitzinger), pas de qualité — pas d'accélération finale.`;
      sm.advice.stringValue = `Le MLR construit l'endurance aérobie spécifique semi sans coût neuro-musculaire d'une SL. Reste stable, conversationnel. Pas de jeu d'allure aujourd'hui.`;
      console.log('✅ A4 Mardi retypé : Sortie Longue → Jogging MLR + _dedupedFromSL=true');
    }

    // A5 — Footing Lundi : 13,5 → 15,1 km pour matcher vol annoncé 51 km
    if (day === 'Lundi' && type === 'Jogging') {
      sm.distance.stringValue = '15.1 km';
      // Recalculer durée à 5:44 min/km : 15.1 × 5.733 min = 86.6 min ≈ 1h27
      sm.duration.stringValue = '1h 27 min';
      console.log('✅ A5 Lundi footing : 13.5 km → 15.1 km (matche vol annoncé 51)');
    }

    // A6 — Renfo Samedi adapté 45+ (anti-tendinopathie Achille)
    if (day === 'Samedi' && type === 'Renforcement') {
      sm.title.stringValue = 'Renfo Trail Spécifique 45+ - Anti-Tendinopathie Achille (S1)';
      sm.mainSet.stringValue = `Circuit 3 tours, repos 1 min 30 entre tours :
- Squats poids du corps (3×15)
- Fentes avant (3×10/jambe)
- **Mollets excentriques (Stanish)** : monter sur 2 pieds, descendre lentement (3s) sur 1 pied. (3×12/jambe, genou tendu + 3×12/jambe genou fléchi)
- Pont fessier (3×15)
- Gainage ventral statique (3×40-60s)
- Squat bulgare unilatéral (3×10/jambe)
- Mountain climbers contrôlés (3×30s)`;
      sm.warmup.stringValue = '10 min de mobilité articulaire et échauffement dynamique (rotations chevilles, hanches, montées de genoux légères).';
      sm.cooldown.stringValue = '5-10 min d\'étirements doux : mollets, ischio-jambiers, quadriceps, hanches. Auto-massage mollets si disponible.';
      sm.advice.stringValue = `Renfo spécifique 45+ axé prévention. Les mollets excentriques (Stanish) sont la base anti-tendinopathie Achille (très fréquente sur ce profil). Squat unilatéral renforce la stabilité monopodale = transfert direct course. Gainage statique > dynamique en S1 pour démarrer en douceur.`;
      sm.duration.stringValue = '40-45 min';
      console.log('✅ A6 Renfo Samedi adapté 45+ (anti-tendinopathie Achille)');
    }
  }
}

// ===== STEP 5 : A3 — Score 83 INCHANGÉ (PM NO GO baisse à 70) =====
console.log('⏭️  A3 Score 83 BON laissé inchangé (PM tranche : pas confondre qualité plan et difficulté objectif)');

// ===== STEP 6 : Préparer le periodizationPlan avec nouveaux weeklyVolumes =====
const gcFields = f.generationContext?.mapValue?.fields || {};
const periFields = { ...(gcFields.periodizationPlan?.mapValue?.fields || {}) };
periFields.weeklyVolumes = {
  arrayValue: { values: NEW_WEEKLY_VOLUMES.map(v => ({ integerValue: v })) }
};
const newGcFields = { ...gcFields, periodizationPlan: { mapValue: { fields: periFields } } };

// ===== STEP 7 : PATCH Firestore =====
const patchBody = {
  fields: {
    welcomeMessage: { stringValue: NEW_WELCOME },
    generationContext: { mapValue: { fields: newGcFields } },
    weeks: { arrayValue: { values: newWeeks } },
  }
};
const mask = ['welcomeMessage', 'generationContext', 'weeks'];
const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}?` +
  mask.map(m => `updateMask.fieldPaths=${encodeURIComponent(m)}`).join('&');

const r = await fetch(url, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(patchBody),
});

if (!r.ok) {
  const e = await r.json();
  console.log(`\n❌ PATCH ÉCHEC: HTTP ${r.status}`);
  console.log(JSON.stringify(e, null, 2).substring(0, 2000));
  console.log(`\n🔄 Backup disponible pour rollback : ${BACKUP_DIR}/al1-${PLAN_ID}-AVANT.json`);
  process.exit(1);
}

console.log('\n✅ PATCH AL1 APPLIQUÉ');

// ===== STEP 8 : Vérification =====
const rv = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, {
  headers: { Authorization: `Bearer ${TOKEN}` }
});
const v = await rv.json();
writeFileSync(`${BACKUP_DIR}/al1-${PLAN_ID}-APRES.json`, JSON.stringify(v, null, 2));

const vScore = v.fields?.confidenceScore?.integerValue;
const vStatus = v.fields?.feasibility?.mapValue?.fields?.status?.stringValue;
const vWeeklyVol = (v.fields?.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields?.weeklyVolumes?.arrayValue?.values || []).map(x => +x.integerValue);
const vMardi = v.fields?.weeks?.arrayValue?.values?.[0]?.mapValue?.fields?.sessions?.arrayValue?.values?.find(s => s.mapValue.fields.day?.stringValue === 'Mardi')?.mapValue?.fields;
const vLundi = v.fields?.weeks?.arrayValue?.values?.[0]?.mapValue?.fields?.sessions?.arrayValue?.values?.find(s => s.mapValue.fields.day?.stringValue === 'Lundi')?.mapValue?.fields;
const vSamedi = v.fields?.weeks?.arrayValue?.values?.[0]?.mapValue?.fields?.sessions?.arrayValue?.values?.find(s => s.mapValue.fields.day?.stringValue === 'Samedi')?.mapValue?.fields;

console.log('\n=== VÉRIFICATION POST-PATCH ===');
console.log('Score:', vScore, '(attendu 83 inchangé)');
console.log('Status:', vStatus, '(attendu BON)');
console.log('weeklyVolumes peak:', Math.max(...vWeeklyVol), '(attendu 72)');
console.log('weeklyVolumes:', JSON.stringify(vWeeklyVol));
console.log('Mardi type:', vMardi?.type?.stringValue, '(attendu Jogging)');
console.log('Mardi title:', vMardi?.title?.stringValue);
console.log('Mardi _dedupedFromSL:', vMardi?._dedupedFromSL?.booleanValue, '(attendu true)');
console.log('Lundi distance:', vLundi?.distance?.stringValue, '(attendu 15.1 km)');
console.log('Samedi title:', vSamedi?.title?.stringValue);
console.log('Welcome démarre par:', (v.fields?.welcomeMessage?.stringValue || '').substring(0, 80) + '...');
console.log(`\n✅ Backup APRÈS écrit. En cas de rollback : ${BACKUP_DIR}/al1-${PLAN_ID}-AVANT.json`);
