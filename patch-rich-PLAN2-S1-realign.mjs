#!/usr/bin/env node
/**
 * patch-rich-PLAN2-S1-realign.mjs
 *
 * Aligne weeks[0].sessions du Plan 2 (preview, id=1775644846100) sur la
 * periodization (S1 = 70 km / 3000 m D+) afin d'éviter le saut S1 -> S2 incohérent.
 *
 * Cible (5 séances, freq 5, Master 55 ultra) :
 *  - Mardi    | Footing vallonné        | 12 km | 60 min  | 400  m D+
 *  - Mercredi | Renfo Trail             |  0 km | 45-50min|   0  m D+ (inchangé)
 *  - Jeudi    | Footing vallonné        | 14 km | 75 min  | 700  m D+
 *  - Samedi   | Sortie Longue Trail     | 24 km | 3h30    | 1700 m D+
 *  - Dimanche | Récupération nature     | 20 km | 1h45    | 200  m D+
 *  TOTAL = 70 km / 3000 m D+
 *
 * Doctrine :
 *  - Allures (paces, targetPace) INTACTES
 *  - mainSet philosophie préservée (juste chiffres km/durée/D+ ajustés)
 *  - Aucun mot interdit (poids/IMC/minceur/silhouette/kilos/corpulence/maigrir)
 *  - Idempotent (re-run safe : on écrit toujours les valeurs cibles)
 */

import { execSync } from 'node:child_process';

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1775644846100';
const DOC_PATH = `projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
const URL = `https://firestore.googleapis.com/v1/${DOC_PATH}`;

function token() {
  return execSync('gcloud auth print-access-token').toString().trim();
}

function fetchDoc() {
  const t = token();
  const out = execSync(
    `curl -s -H "Authorization: Bearer ${t}" "${URL}"`,
    { maxBuffer: 50 * 1024 * 1024 }
  ).toString();
  return JSON.parse(out);
}

// ---- Cibles S1 ----
const TARGET = {
  Mardi: {
    distance:      '12.0 km',
    duration:      '60 min',
    elevationGain: 400,
    mainSetSrc:
      "45 min de course en endurance fondamentale (EF) à 5:06 min/km, sur terrain plat. Tu dois pouvoir parler sans être essoufflé. L'objectif est de développer l'endurance aérobie et l'efficacité cardiaque.",
    mainSetDst:
      "60 min de course en endurance fondamentale (EF) à 5:06 min/km, sur terrain légèrement vallonné (~400 m D+). Tu dois pouvoir parler sans être essoufflé. L'objectif est de développer l'endurance aérobie et l'efficacité cardiaque.",
  },
  Mercredi: {
    // Inchangé (renforcement, 0 km / 0 D+).
    distance:      '0 km',
    duration:      '45-50 min',
    elevationGain: 0,
    mainSetSrc: null, // pas de modification
    mainSetDst: null,
  },
  Jeudi: {
    distance:      '14.0 km',
    duration:      '75 min',
    elevationGain: 700,
    mainSetSrc:
      "50 min de course en endurance fondamentale (EF). Cherche un parcours légèrement vallonné pour intégrer de petites montées et descentes. Maintiens l'allure EF sur le plat et adapte l'effort en côte (pouvant passer à une allure plus lente, jusqu'à 7:00-8:00 min/km, ou même de la marche active si la pente est forte, toujours en aisance respiratoire). Le dénivelé cumulé sera d'environ 150m. L'objectif est d'habituer le corps au terrain varié.",
    mainSetDst:
      "75 min de course en endurance fondamentale (EF). Cherche un parcours vallonné pour intégrer des montées et descentes. Maintiens l'allure EF sur le plat et adapte l'effort en côte (pouvant passer à une allure plus lente, jusqu'à 7:00-8:00 min/km, ou même de la marche active si la pente est forte, toujours en aisance respiratoire). Le dénivelé cumulé sera d'environ 700m. L'objectif est d'habituer le corps au terrain varié.",
  },
  Samedi: {
    distance:      '24.0 km',
    duration:      '3h30',
    elevationGain: 1700,
    mainSetSrc:
      "2h45 (165 min) de sortie longue en endurance fondamentale sur des sentiers vallonnés. L'objectif est d'accumuler du temps de course à faible intensité pour développer l'endurance aérobie spécifique au trail. Intègre des sections de marche rapide en côte (power hiking) dès que la pente le justifie, en maintenant une bonne posture et un bon rythme cardiaque (zone EF). Gère ton allure pour rester confortable tout au long de la sortie. Environ 600m de D+ sont visés. Teste ta stratégie de ravitaillement : mange de petites quantités toutes les 30-45 minutes et bois régulièrement. (allure : 5:06 min/km)",
    mainSetDst:
      "3h30 (210 min) de sortie longue en endurance fondamentale sur des sentiers vallonnés. L'objectif est d'accumuler du temps de course à faible intensité pour développer l'endurance aérobie spécifique au trail. Intègre des sections de marche rapide en côte (power hiking) dès que la pente le justifie, en maintenant une bonne posture et un bon rythme cardiaque (zone EF). Gère ton allure pour rester confortable tout au long de la sortie. Environ 1700m de D+ sont visés. Teste ta stratégie de ravitaillement : mange de petites quantités toutes les 30-45 minutes et bois régulièrement. (allure : 5:06 min/km)",
  },
  Dimanche: {
    distance:      '20.0 km',
    duration:      '1h45',
    elevationGain: 200,
    mainSetSrc:
      "45 min de course en endurance fondamentale (EF) sur un terrain souple et plat (chemin de terre, herbe si possible). Ce footing sert de récupération active et d'entretien. L'allure doit être très facile, légèrement plus lente que d'habitude si tu ressens une fatigue résiduelle de la veille. Concentre-toi sur une foulée légère et relâchée.",
    mainSetDst:
      "1h45 (105 min) de course en endurance fondamentale (EF) sur un terrain souple et plat (chemin de terre, herbe si possible). Ce footing sert de récupération active et d'entretien. L'allure doit être très facile, légèrement plus lente que d'habitude si tu ressens une fatigue résiduelle de la veille. Concentre-toi sur une foulée légère et relâchée.",
  },
};

// ---- Mots interdits ----
const FORBIDDEN = ['poids', 'imc', 'minceur', 'silhouette', 'kilos', 'corpulence', 'maigrir'];
function assertSafe(label, txt) {
  if (!txt) return;
  const low = txt.toLowerCase();
  for (const w of FORBIDDEN) {
    if (low.includes(w)) {
      throw new Error(`Mot interdit "${w}" détecté dans ${label}: ${txt.slice(0,120)}`);
    }
  }
}

function patchSessionFields(sessionMap) {
  const sf = sessionMap.mapValue.fields;
  const day = sf.day?.stringValue;
  const tgt = TARGET[day];
  if (!tgt) {
    console.log(`  [skip] jour inconnu: ${day}`);
    return false;
  }

  // distance + duration -> stringValue
  sf.distance = { stringValue: tgt.distance };
  sf.duration = { stringValue: tgt.duration };
  // elevationGain -> integerValue (string)
  sf.elevationGain = { integerValue: String(tgt.elevationGain) };

  // mainSet : remplacer uniquement si on a une cible explicite ET si l'original
  // matche le src attendu (sinon, idempotent : on remet la cible quoi qu'il arrive,
  // mais on vérifie au moins qu'on ne casse pas une version déjà patchée).
  if (tgt.mainSetDst != null) {
    const current = sf.mainSet?.stringValue ?? '';
    if (current !== tgt.mainSetDst) {
      sf.mainSet = { stringValue: tgt.mainSetDst };
    }
    assertSafe(`mainSet[${day}]`, tgt.mainSetDst);
  }

  return true;
}

(async () => {
  console.log(`>>> Plan 2 Rich (${PLAN_ID}) — realign S1 sur 70 km / 3000 m D+`);
  const doc = fetchDoc();
  if (!doc.fields) {
    throw new Error('Document introuvable ou réponse inattendue.');
  }
  const weeks = doc.fields.weeks?.arrayValue?.values;
  if (!weeks?.length) throw new Error('Aucune semaine dans weeks[].');

  const w0 = weeks[0].mapValue.fields;
  const sessions = w0.sessions.arrayValue.values;
  console.log(`Sessions S1 trouvées : ${sessions.length}`);

  let totalDist = 0, totalElev = 0;
  for (const s of sessions) {
    patchSessionFields(s);
    const sf = s.mapValue.fields;
    const distStr = sf.distance?.stringValue || '0';
    const distNum = parseFloat(distStr.replace(/[^\d.]/g, '')) || 0;
    const elev = parseInt(sf.elevationGain?.integerValue || '0', 10);
    totalDist += distNum;
    totalElev += elev;
    console.log(`  ${sf.day?.stringValue.padEnd(9)} | ${distStr.padEnd(8)} | ${sf.duration?.stringValue.padEnd(10)} | ${elev} m D+`);
  }
  console.log(`TOTAL S1 cible : ${totalDist} km / ${totalElev} m D+`);

  if (totalDist !== 70 || totalElev !== 3000) {
    throw new Error(`Total S1 incorrect : ${totalDist} km / ${totalElev} m D+ (attendu 70 / 3000)`);
  }

  // Build PATCH body avec updateMask pour ne toucher QUE weeks
  const body = {
    fields: { weeks: doc.fields.weeks },
  };
  const t = token();
  const tmp = `/tmp/patch-rich-plan2-s1-${Date.now()}.json`;
  execSync(`cat > ${tmp} <<'JSON_EOF'\n${JSON.stringify(body)}\nJSON_EOF`);

  const patchUrl = `${URL}?updateMask.fieldPaths=weeks`;
  const res = execSync(
    `curl -s -X PATCH -H "Authorization: Bearer ${t}" -H "Content-Type: application/json" --data-binary @${tmp} "${patchUrl}"`,
    { maxBuffer: 50 * 1024 * 1024 }
  ).toString();
  const parsed = JSON.parse(res);
  if (parsed.error) {
    console.error('ERREUR PATCH :', parsed.error);
    process.exit(1);
  }
  console.log('PATCH OK -> updateTime:', parsed.updateTime);

  // Re-read
  const after = fetchDoc();
  const aSessions = after.fields.weeks.arrayValue.values[0].mapValue.fields.sessions.arrayValue.values;
  let dA = 0, eA = 0;
  console.log('\n--- RE-READ ---');
  for (const s of aSessions) {
    const sf = s.mapValue.fields;
    const distStr = sf.distance?.stringValue || '0';
    const distNum = parseFloat(distStr.replace(/[^\d.]/g, '')) || 0;
    const elev = parseInt(sf.elevationGain?.integerValue || '0', 10);
    dA += distNum; eA += elev;
    console.log(`  ${sf.day?.stringValue.padEnd(9)} | ${distStr.padEnd(8)} | ${(sf.duration?.stringValue||'').padEnd(10)} | ${elev} m D+`);
  }
  console.log(`TOTAL S1 après re-read : ${dA} km / ${eA} m D+`);
  if (dA !== 70 || eA !== 3000) {
    console.error('ECHEC: total post-patch ne matche pas la cible.');
    process.exit(2);
  }
  console.log('\nOK — S1 alignée sur periodization (70 km / 3000 m D+).');
})().catch(e => { console.error('FATAL', e); process.exit(99); });
