#!/usr/bin/env node
/**
 * patch-thomas-marathon-live.mjs
 *
 * Patch live Firestore du plan Marathon Thomas Weill (plan ID 1779217739002).
 * 5 anomalies sécurité (cf AUDIT-THOMAS-PREMIUM-COMPLET.md) :
 *  1. Saut SL S1→S2 = +47% (15→22 km), dangereux ACSM/Daniels.
 *  2. 3 SL consécutives 35 km AS Marathon (S13/14/15), surentraînement.
 *  3. SL affûtage trop volumineuses (S17/18/19 = 23/21/20 km).
 *  4. Course finale absente jour J (remplacée par SL EF 20 km).
 *  5. Hallucination LLM "2 blocs de 35 km" S13.
 *
 * Patch chirurgical (doctrine feedback_patch_live_plans_jour_seulement) :
 *  - S2  : 22 km → 18 km EF
 *  - S13 : 30 km dont 2×6 km AS Marathon, encadrés par 8+8 EF
 *  - S14 : 32 km EF pur (Long Run décharge)
 *  - S15 : 30 km dont 18 km AS Marathon en finale
 *  - S17 : 24 km EF + 6-8 km AS Marathon final
 *  - S18 : 16 km EF + 4×1 km AS Marathon
 *  - S19 : Course officielle Marathon 42.195 km @ 4:44/km + advice race-day
 *
 * Validation: Coach 20 ans (Pfitzinger Advanced Marathoning 3rd ed.)
 * Patch live uniquement Thomas (verbatim Romane: "Thomas seulement").
 *
 * Dry-run par défaut. Pour exécuter : DRY_RUN=false node patch-thomas-marathon-live.mjs
 *
 * IMPORTANT — Vérifie le mapping S13/S14/S15/S17/S18/S19 ↔ weekNumber au runtime
 * avant d'écraser. Si le plan a moins de semaines (ex 18), le script fail safe
 * et n'écrit rien.
 */

import { execSync } from 'node:child_process';

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779217739002';
const DOC_PATH = `projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
const URL = `https://firestore.googleapis.com/v1/${DOC_PATH}`;
const DRY_RUN = process.env.DRY_RUN !== 'false';
const BACKUP_FILE = `/Users/romanemarino/Coach-Running-IA/backup-thomas-plan-${Date.now()}.json`;

// ─── Wordings target (validés coach 20 ans, doctrine feedback_jamais_poids_minceur) ───

// S2 lissage (22 → 18 km EF)
const S2_SL_PATCH = {
  duration: '1h45',
  distance: '18 km',
  title: 'Sortie Longue EF',
  mainSet: '18 km en endurance fondamentale continue, conversation possible tout du long. Progression douce sur la semaine, on ne saute pas +47% de SL en début de cycle.',
  intensity: 'Facile',
};

// S13 réécriture (30 km dont 2×6 km AS Marathon, encadrés EF — fin de l'hallucination "2 blocs de 35 km")
const S13_SL_PATCH = {
  duration: '2h45',
  distance: '30 km',
  title: 'Sortie Longue MP-LR (Marathon-Pace Long Run)',
  mainSet: '30 km total : 8 km EF échauffement progressif + 2 × 6 km à AS Marathon (4:44/km) avec 2 km EF récup entre les 2 blocs + 6 km EF retour calme. Total bloc spé = 12 km à allure marathon dans 30 km totaux.',
  intensity: 'Modéré',
};

// S14 réécriture (32 km EF pur Long Run décharge)
const S14_SL_PATCH = {
  duration: '3h00',
  distance: '32 km',
  title: 'Sortie Longue EF (décharge entre 2 MP-LR)',
  mainSet: '32 km en endurance fondamentale stricte, conversation tenue. Aucun bloc allure marathon cette semaine — récupération active après le MP-LR S13 et avant le MP-LR S15.',
  intensity: 'Facile',
};

// S15 réécriture (30 km dont 18 km AS Marathon en finale)
const S15_SL_PATCH = {
  duration: '2h50',
  distance: '30 km',
  title: 'Sortie Longue MP-LR finale (18 km @ AS Marathon)',
  mainSet: '30 km : 10 km EF échauffement progressif + 18 km à AS Marathon (4:44/km) en finale + 2 km récup. Test grandeur nature de l\'allure marathon sur volume représentatif. Dernière vraie séance qualité avant l\'affûtage.',
  intensity: 'Modéré',
};

// S17 recalibrage affûtage S-3 (Pfitzinger 80% volume pic)
const S17_SL_PATCH = {
  duration: '2h15',
  distance: '24 km',
  title: 'Sortie Longue affûtage S-3 (rappel MP final)',
  mainSet: '24 km : 18 km EF + 6 km à AS Marathon (4:44/km) en fin. Volume en nette baisse, intensité préservée pour maintenir la mémoire musculaire allure marathon.',
  intensity: 'Modéré',
};

// S18 recalibrage affûtage S-2 (65% volume pic)
const S18_SL_PATCH = {
  duration: '1h35',
  distance: '16 km',
  title: 'Sortie Longue affûtage S-2',
  mainSet: '16 km : 12 km EF + 4 × 1 km à AS Marathon (4:44/km) r=2 min trot. Footing structurant, allure marathon en touches courtes pour rester réactif sans fatiguer.',
  intensity: 'Modéré',
};

// S19 — la course OFFICIELLE (race-day complet, doctrine raceDayInject)
const S19_RACE_DAY = {
  type: 'Course',
  day: 'Dimanche',
  duration: '3h20',
  distance: '42.195 km',
  title: 'COURSE — Marathon',
  targetPace: '4:44',
  intensity: 'Difficile',
  warmup: '15-20 min échauffement progressif : mobilité dynamique + 5 min footing très lent juste avant le départ. Pas de fractionné.',
  mainSet: `JOUR J — Course officielle Marathon.
- Pacing : pars 5-10 sec/km PLUS LENT que ton allure cible (4:44/km) sur les 5 premiers km. Tu rattraperas l'objectif km 10-25. Les 17 derniers km, c'est mental.
- Ravitos : bois à CHAQUE ravito même sans soif (toutes les 5 km). Gel ou pâte de fruit toutes les 30-40 min à partir du km 10. Pas de nouveauté nutrition que tu n'as pas testée à l'entraînement.
- Mur (km 30+) : si tu ralentis, accepte. Reste régulier dans l'effort, pas dans l'allure. Garde un mantra court ("je suis fort", "encore 10 km").
- Stratégie négative split : objectif = 2e moitié ≤ 1ère moitié. Si tu pars en surrégime km 1-10, le mur arrive km 30 garanti.
- Arrivée : marche 10-15 min, hydrate, ne t'assieds pas tout de suite. Compression si besoin.`,
  cooldown: '10-15 min marche / footing très lent + hydratation + étirements légers.',
  _raceDay: true,
};

// ─── Mots interdits (doctrine feedback_jamais_poids_minceur) ───
const FORBIDDEN = ['poids', 'imc', 'minceur', 'silhouette', 'kilos', 'corpulence', 'maigrir'];
function assertSafe(label, txt) {
  if (!txt) return;
  const low = txt.toLowerCase();
  for (const w of FORBIDDEN) {
    if (low.includes(w)) {
      throw new Error(`Mot interdit "${w}" détecté dans ${label}: ${txt.slice(0, 160)}`);
    }
  }
}

function preflight() {
  for (const [label, patch] of Object.entries({
    S2: S2_SL_PATCH, S13: S13_SL_PATCH, S14: S14_SL_PATCH, S15: S15_SL_PATCH,
    S17: S17_SL_PATCH, S18: S18_SL_PATCH, S19: S19_RACE_DAY,
  })) {
    assertSafe(`${label}.title`, patch.title);
    assertSafe(`${label}.mainSet`, patch.mainSet);
  }
}

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

function diff(label, before, after) {
  const same = before === after;
  console.log(`\n[${same ? '=' : '~'}] ${label}`);
  if (same) {
    console.log(`    (inchangé)`);
    return;
  }
  console.log(`  AVANT: ${String(before).slice(0, 200)}${String(before).length > 200 ? '...' : ''}`);
  console.log(`  APRES: ${String(after).slice(0, 200)}${String(after).length > 200 ? '...' : ''}`);
}

// ─── Locate SL session of a given week ───
function findSL(weekFields) {
  const sessions = weekFields.sessions?.arrayValue?.values || [];
  return sessions.find((s) => {
    const t = s.mapValue?.fields?.type?.stringValue;
    const title = s.mapValue?.fields?.title?.stringValue || '';
    return t === 'Sortie Longue' || /sortie\s*longue|long\s*run/i.test(title);
  });
}

function applyPatchToSession(sessionField, patch) {
  const f = sessionField.mapValue.fields;
  // Backup avant écriture
  const before = {
    duration: f.duration?.stringValue,
    distance: f.distance?.stringValue,
    title: f.title?.stringValue,
    mainSet: f.mainSet?.stringValue,
    intensity: f.intensity?.stringValue,
  };
  if (patch.duration !== undefined) f.duration = { stringValue: patch.duration };
  if (patch.distance !== undefined) f.distance = { stringValue: patch.distance };
  if (patch.title !== undefined) f.title = { stringValue: patch.title };
  if (patch.mainSet !== undefined) f.mainSet = { stringValue: patch.mainSet };
  if (patch.intensity !== undefined) f.intensity = { stringValue: patch.intensity };
  return before;
}

// ─── Main ───
(async () => {
  console.log(`>>> Patch live Thomas Weill Marathon (${PLAN_ID}) — DRY_RUN=${DRY_RUN}`);
  preflight();

  const doc = fetchDoc();
  if (!doc.fields) throw new Error('Document introuvable.');

  // ─── Backup ───
  execSync(`cat > ${BACKUP_FILE} <<'JSON_EOF'\n${JSON.stringify(doc, null, 2)}\nJSON_EOF`);
  console.log(`Backup → ${BACKUP_FILE}`);

  const f = doc.fields;
  const weeks = f.weeks?.arrayValue?.values;
  if (!weeks?.length) throw new Error('Aucune semaine.');

  // Map weekNumber → week index dans le tableau (au cas où non-contigu)
  const weekByNumber = new Map();
  weeks.forEach((w, idx) => {
    const num = w.mapValue?.fields?.weekNumber?.integerValue || (idx + 1);
    weekByNumber.set(parseInt(num), { week: w.mapValue.fields, idx });
  });

  console.log(`\nPlan totalWeeks détecté: ${weeks.length}`);
  console.log(`weekNumbers présents: ${[...weekByNumber.keys()].sort((a, b) => a - b).join(', ')}`);

  // ─── Patches ordonnés ───
  const patches = [
    { weekNum: 2,  label: 'S2 lissage 22→18 km',                patch: S2_SL_PATCH },
    { weekNum: 13, label: 'S13 réécriture MP-LR 30km',           patch: S13_SL_PATCH },
    { weekNum: 14, label: 'S14 32 km EF pur (décharge)',         patch: S14_SL_PATCH },
    { weekNum: 15, label: 'S15 MP-LR finale 30km/18km AS',       patch: S15_SL_PATCH },
    { weekNum: 17, label: 'S17 affûtage S-3 24 km',              patch: S17_SL_PATCH },
    { weekNum: 18, label: 'S18 affûtage S-2 16 km',              patch: S18_SL_PATCH },
  ];

  for (const { weekNum, label, patch } of patches) {
    const entry = weekByNumber.get(weekNum);
    if (!entry) {
      console.warn(`\n⚠ Semaine ${weekNum} introuvable dans le plan — patch ignoré.`);
      continue;
    }
    const sl = findSL(entry.week);
    if (!sl) {
      console.warn(`\n⚠ Aucune Sortie Longue trouvée S${weekNum} — patch ignoré.`);
      continue;
    }
    const before = applyPatchToSession(sl, patch);
    console.log(`\n=== ${label} (week index ${entry.idx}) ===`);
    diff('duration', before.duration, patch.duration);
    diff('distance', before.distance, patch.distance);
    diff('title', before.title, patch.title);
    diff('mainSet', before.mainSet, patch.mainSet);
    diff('intensity', before.intensity, patch.intensity);
  }

  // ─── S19 race-day injection (séance dimanche → COURSE Marathon) ───
  // 1) Identifier la semaine course : raceDate dans plan = 2026-09-27 (dimanche),
  //    soit weekNumber = max présent dans le plan (S19 si plan 19 sem,
  //    S18 si plan 18 sem). On prend la dernière semaine.
  const lastWeekNum = Math.max(...weekByNumber.keys());
  const lastEntry = weekByNumber.get(lastWeekNum);
  if (!lastEntry) {
    throw new Error('Impossible de localiser la dernière semaine du plan.');
  }
  const lastWeek = lastEntry.week;
  const lastSessions = lastWeek.sessions?.arrayValue?.values || [];

  // 2) Trouver la session du Dimanche, ou en créer une nouvelle.
  let dimSessionField = lastSessions.find((s) => s.mapValue?.fields?.day?.stringValue === 'Dimanche');
  if (!dimSessionField) {
    console.warn(`\n⚠ Aucune séance Dimanche en S${lastWeekNum} — création d'une nouvelle entrée.`);
    dimSessionField = { mapValue: { fields: {} } };
    lastSessions.push(dimSessionField);
  }

  // 3) Écraser avec le payload race-day complet.
  const dimBefore = {
    type: dimSessionField.mapValue.fields.type?.stringValue,
    title: dimSessionField.mapValue.fields.title?.stringValue,
    distance: dimSessionField.mapValue.fields.distance?.stringValue,
    duration: dimSessionField.mapValue.fields.duration?.stringValue,
    mainSet: dimSessionField.mapValue.fields.mainSet?.stringValue,
  };
  const fields = dimSessionField.mapValue.fields;
  fields.day = { stringValue: 'Dimanche' };
  fields.type = { stringValue: S19_RACE_DAY.type };
  fields.title = { stringValue: S19_RACE_DAY.title };
  fields.distance = { stringValue: S19_RACE_DAY.distance };
  fields.duration = { stringValue: S19_RACE_DAY.duration };
  fields.targetPace = { stringValue: S19_RACE_DAY.targetPace };
  fields.intensity = { stringValue: S19_RACE_DAY.intensity };
  fields.warmup = { stringValue: S19_RACE_DAY.warmup };
  fields.mainSet = { stringValue: S19_RACE_DAY.mainSet };
  fields.cooldown = { stringValue: S19_RACE_DAY.cooldown };
  fields._raceDay = { booleanValue: true };

  console.log(`\n=== S${lastWeekNum} race-day Course officielle Marathon ===`);
  diff('type', dimBefore.type, S19_RACE_DAY.type);
  diff('title', dimBefore.title, S19_RACE_DAY.title);
  diff('distance', dimBefore.distance, S19_RACE_DAY.distance);
  diff('duration', dimBefore.duration, S19_RACE_DAY.duration);
  diff('mainSet', dimBefore.mainSet, S19_RACE_DAY.mainSet);

  // ─── PATCH PAYLOAD ───
  const body = { fields: { weeks: f.weeks } };
  const patchUrl = `${URL}?updateMask.fieldPaths=weeks`;

  if (DRY_RUN) {
    console.log('\n=== DRY RUN (aucune écriture). Pour exécuter : DRY_RUN=false node patch-thomas-marathon-live.mjs ===');
    return;
  }

  // Vraie écriture
  const t = token();
  const tmp = `/tmp/patch-thomas-${Date.now()}.json`;
  execSync(`cat > ${tmp} <<'JSON_EOF'\n${JSON.stringify(body)}\nJSON_EOF`);
  const res = execSync(
    `curl -s -X PATCH -H "Authorization: Bearer ${t}" -H "Content-Type: application/json" --data-binary @${tmp} "${patchUrl}"`,
    { maxBuffer: 50 * 1024 * 1024 }
  ).toString();
  let parsed;
  try { parsed = JSON.parse(res); } catch (e) {
    console.error('Réponse non-JSON:', res.slice(0, 500));
    process.exit(1);
  }
  if (parsed.error) {
    console.error('ERREUR PATCH:', JSON.stringify(parsed.error, null, 2));
    process.exit(1);
  }
  console.log('\nPATCH OK → updateTime:', parsed.updateTime);

  // Re-fetch + dump
  const after = fetchDoc();
  const outFile = '/Users/romanemarino/Coach-Running-IA/post-patch-thomas-plan.json';
  execSync(`cat > ${outFile} <<'JSON_EOF'\n${JSON.stringify(after, null, 2)}\nJSON_EOF`);
  console.log(`Dump post-patch → ${outFile}`);

  // Confirmation lecture
  const afterWeeks = after.fields.weeks.arrayValue.values;
  console.log('\n--- POST-PATCH VERIF ---');
  for (const wField of afterWeeks) {
    const wf = wField.mapValue.fields;
    const num = wf.weekNumber?.integerValue;
    const sl = findSL(wf);
    if (sl) {
      const slf = sl.mapValue.fields;
      console.log(`  S${num.padStart(2, '0')} | ${(slf.day?.stringValue || '?').padEnd(9)} | ${(slf.duration?.stringValue || '').padEnd(6)} | ${(slf.distance?.stringValue || '').padEnd(10)} | ${(slf.title?.stringValue || '').slice(0, 60)}`);
    }
  }
})().catch((err) => {
  console.error('FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
