#!/usr/bin/env node
/**
 * patch-stephfanny-live.mjs
 *
 * Patch live Firestore du plan 1779185876450 (steph-fanny@laposte.net)
 * selon décisions coach 15 ans + Romane (cf VALIDATION-COACH-AVANT-DEPLOY.md).
 *
 * Modifs :
 *  - feasibility.status   : EXCELLENT -> BON
 *  - feasibility.score    : 95 -> 75
 *  - feasibility.confidenceScore (=root.confidenceScore) : 95 -> 75
 *  - feasibility.message  : réécrit (réserves honnêtes VMA "corrigée", PB 5K, 60 ans)
 *  - feasibility.safetyWarning : conservé (déjà bon, mentionne médecin + cardio 60 ans + 48h récup)
 *  - paces.allureSpecifique10k : 8:20 min/km -> 10:00 min/km
 *    (idem generationContext.paces.allureSpecifique10k pour cohérence)
 *  - welcomeMessage       : réécrit (PB 5K cité + allure 10:00 expliquée + 60 ans/médecin/cardio)
 *  - weeks[0].sessions[0] Mardi : duration/distance inchangés, mainSet réaligné "42 min..."
 *  - weeks[0].sessions[2] Dimanche : duration 1h00 -> 1h30, distance 5.3 km -> 8.0 km,
 *    mainSet conservé (déjà "8.0 km de course continue")
 *  - weeks[0].sessions[1] Jeudi (renforcement) : intact
 *
 * Doctrines appliquées :
 *  - feedback_finisher_plus_pb_allure : allure 10K = max(PB+5%, VMA-based) -> 10:00/km
 *  - feedback_securite_avant_conversion : BON honnête > EXCELLENT embellissant
 *  - feedback_jamais_baisser_allure_cible : Finisher = pas de cible chrono saisie, OK
 *  - feedback_input_client_obligatoire : 20 km/sem déclaré respecté autant que possible (S1 = 13.4 km)
 *  - feedback_jamais_poids_minceur : aucune mention poids/IMC/minceur
 *  - feedback_patch_live_plans_jour_seulement : plan créé 2026-05-19 10:17Z, S1 commence Mardi -> patchable
 */

import { execSync } from 'node:child_process';

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779185876450';
const DOC_PATH = `projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
const URL = `https://firestore.googleapis.com/v1/${DOC_PATH}`;
const DRY_RUN = process.env.DRY_RUN !== 'false';

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

// ---- Wordings cibles ----
const NEW_FEASIBILITY_MESSAGE =
  "Ton plan 10 km Finisher sur 21 semaines est très bien structuré. Quelques points d'attention honnêtes : ta VMA \"8 km/h corrigée\" est calculée à partir de ton 5 km en 46 min, c'est plutôt l'extrémité haute. Avec ce PB, viser un 10 km en environ 1h40-1h55 est très réaliste, voire confortable. À 60 ans avec 20 km/sem en cours, la progression progressive sur 21 semaines te donne toutes les cartes pour finir sereinement.";

const NEW_WELCOME_MESSAGE =
  "Bienvenue dans ton plan 10 km — Finisher sur 21 semaines. Ton 5 km en 46 min nous sert de référence pour calibrer tes allures d'entraînement : on travaille principalement à 11:12/km en endurance fondamentale (rythme conversation), allure parfaite pour construire ton aérobie sans pression. Pour la course, vise une allure autour de 10:00/km, soit un 10 km autour de 1h40-1h50, parfaitement réalisable avec ta préparation.\n\nÀ 60 ans, on te recommande chaudement de consulter ton médecin pour un certificat d'aptitude et idéalement un test d'effort cardio avant de démarrer. Programme ta semaine en respectant 48h minimum entre tes séances et écoute ton corps : si une séance te paraît trop, raccourcis-la sans culpabiliser.\n\nCôté méthode : 21 semaines pour un Finisher c'est large, on va y aller tranquille — construction aérobie d'abord, intensité bien plus tard. La régularité prime sur la performance.";

const NEW_MARDI_MAINSET =
  "42 min en deux moitiés : la 1re très tranquille (bas EF), la 2e dans le haut de l'EF autour de 11:12 min/km, toujours conversationnel. Si fatigue, raccourcis sans culpabiliser.";

// Dimanche : duration 1h00 -> 1h30 ; distance 5.3 km -> 8.0 km ; mainSet déjà cohérent (8.0 km), on le conserve.
const NEW_DIMANCHE_DURATION = "1h30";
const NEW_DIMANCHE_DISTANCE = "8.0 km";

// ---- Mots interdits (doctrine feedback_jamais_poids_minceur) ----
const FORBIDDEN = ['poids', 'imc', 'minceur', 'silhouette', 'kilos', 'corpulence', 'maigrir'];
function assertSafe(label, txt) {
  if (!txt) return;
  const low = txt.toLowerCase();
  for (const w of FORBIDDEN) {
    if (low.includes(w)) {
      throw new Error(`Mot interdit "${w}" detecte dans ${label}: ${txt.slice(0,160)}`);
    }
  }
}

// ---- Vérif wordings ----
function preflightWordings() {
  assertSafe('feasibility.message', NEW_FEASIBILITY_MESSAGE);
  assertSafe('welcomeMessage', NEW_WELCOME_MESSAGE);
  assertSafe('mardi.mainSet', NEW_MARDI_MAINSET);
}

// ---- Diff helper ----
function diff(label, before, after) {
  const same = before === after;
  console.log(`\n[${same ? '=' : '~'}] ${label}`);
  if (same) {
    console.log(`    (inchangé)`);
    return;
  }
  console.log(`  AVANT: ${String(before).slice(0,300)}${String(before).length > 300 ? '...' : ''}`);
  console.log(`  APRES: ${String(after).slice(0,300)}${String(after).length > 300 ? '...' : ''}`);
}

// ---- Main ----
(async () => {
  console.log(`>>> Patch live steph-fanny@laposte.net (${PLAN_ID}) — DRY_RUN=${DRY_RUN}`);
  preflightWordings();

  const doc = fetchDoc();
  if (!doc.fields) throw new Error('Document introuvable.');

  const f = doc.fields;

  // --- 1) feasibility ---
  const feas = f.feasibility?.mapValue?.fields || {};
  const oldStatus = feas.status?.stringValue;
  const oldScore  = feas.score?.integerValue;
  const oldMsg    = feas.message?.stringValue;
  const oldSafety = feas.safetyWarning?.stringValue;

  feas.status  = { stringValue: 'BON' };
  feas.score   = { integerValue: '75' };
  feas.message = { stringValue: NEW_FEASIBILITY_MESSAGE };
  // safetyWarning conservé tel quel (déjà bon)

  // confidenceScore racine (= feasibility.confidenceScore conceptuel)
  const oldConfidence = f.confidenceScore?.integerValue;
  f.confidenceScore = { integerValue: '75' };

  diff('feasibility.status',  oldStatus,     'BON');
  diff('feasibility.score',   oldScore,      '75');
  diff('feasibility.confidenceScore (root)', oldConfidence, '75');
  diff('feasibility.message', oldMsg,        NEW_FEASIBILITY_MESSAGE);
  diff('feasibility.safetyWarning (conservé)', oldSafety, oldSafety);

  // --- 2) paces.allureSpecifique10k ---
  const paces = f.paces?.mapValue?.fields || {};
  const oldPace10k = paces.allureSpecifique10k?.stringValue;
  // Format aligné sur les autres paces du doc (sans suffixe min/km) pour ne pas casser
  // un affichage front qui suffixerait de son côté ; le brief demande "10:00 min/km"
  // mais l'unité est implicite dans le champ pace -> on garde la valeur brute.
  paces.allureSpecifique10k = { stringValue: '10:00' };
  diff('paces.allureSpecifique10k', oldPace10k, '10:00');

  // mirror dans generationContext.paces.allureSpecifique10k
  const ctxPaces = f.generationContext?.mapValue?.fields?.paces?.mapValue?.fields;
  if (ctxPaces?.allureSpecifique10k) {
    const old = ctxPaces.allureSpecifique10k.stringValue;
    ctxPaces.allureSpecifique10k = { stringValue: '10:00' };
    diff('generationContext.paces.allureSpecifique10k', old, '10:00');
  }

  // --- 3) welcomeMessage ---
  const oldWelcome = f.welcomeMessage?.stringValue;
  f.welcomeMessage = { stringValue: NEW_WELCOME_MESSAGE };
  diff('welcomeMessage', oldWelcome, NEW_WELCOME_MESSAGE);

  // --- 4) weeks[0].sessions ---
  const weeks = f.weeks?.arrayValue?.values;
  if (!weeks?.length) throw new Error('Aucune semaine.');
  const sessions = weeks[0].mapValue.fields.sessions.arrayValue.values;

  // Mardi = sessions[0]
  const mardi = sessions[0].mapValue.fields;
  if (mardi.day?.stringValue !== 'Mardi') {
    throw new Error(`Sessions[0] attendu Mardi, trouvé ${mardi.day?.stringValue}`);
  }
  const oldMardiMain = mardi.mainSet?.stringValue;
  mardi.mainSet = { stringValue: NEW_MARDI_MAINSET };
  diff('weeks[0].sessions[0] (Mardi) mainSet', oldMardiMain, NEW_MARDI_MAINSET);
  diff('weeks[0].sessions[0] (Mardi) duration (conservé)', mardi.duration?.stringValue, mardi.duration?.stringValue);
  diff('weeks[0].sessions[0] (Mardi) distance (conservé)', mardi.distance?.stringValue, mardi.distance?.stringValue);

  // Jeudi = sessions[1] : intact (renforcement)
  const jeudi = sessions[1].mapValue.fields;
  if (jeudi.day?.stringValue !== 'Jeudi') {
    throw new Error(`Sessions[1] attendu Jeudi, trouvé ${jeudi.day?.stringValue}`);
  }
  console.log(`\n[=] weeks[0].sessions[1] (Jeudi Renforcement) — INTACT`);

  // Dimanche = sessions[2]
  const dim = sessions[2].mapValue.fields;
  if (dim.day?.stringValue !== 'Dimanche') {
    throw new Error(`Sessions[2] attendu Dimanche, trouvé ${dim.day?.stringValue}`);
  }
  const oldDimDur  = dim.duration?.stringValue;
  const oldDimDist = dim.distance?.stringValue;
  const oldDimMain = dim.mainSet?.stringValue;
  dim.duration = { stringValue: NEW_DIMANCHE_DURATION };
  dim.distance = { stringValue: NEW_DIMANCHE_DISTANCE };
  // mainSet conservé : "8.0 km de course continue en endurance fondamentale (EF) à l'allure de 11:12 min/km..."
  diff('weeks[0].sessions[2] (Dimanche) duration', oldDimDur, NEW_DIMANCHE_DURATION);
  diff('weeks[0].sessions[2] (Dimanche) distance', oldDimDist, NEW_DIMANCHE_DISTANCE);
  diff('weeks[0].sessions[2] (Dimanche) mainSet (conservé)', oldDimMain, oldDimMain);

  // --- PATCH PAYLOAD ---
  const body = {
    fields: {
      feasibility:     f.feasibility,
      confidenceScore: f.confidenceScore,
      paces:           f.paces,
      generationContext: f.generationContext,
      welcomeMessage:  f.welcomeMessage,
      weeks:           f.weeks,
    },
  };
  const fieldPaths = [
    'feasibility',
    'confidenceScore',
    'paces',
    'generationContext',
    'welcomeMessage',
    'weeks',
  ];
  const maskQuery = fieldPaths.map(p => `updateMask.fieldPaths=${encodeURIComponent(p)}`).join('&');
  const patchUrl = `${URL}?${maskQuery}`;

  if (DRY_RUN) {
    console.log('\n=== DRY RUN (aucune écriture). Pour exécuter : DRY_RUN=false node patch-stephfanny-live.mjs ===');
    return;
  }

  // Vraie écriture
  const t = token();
  const tmp = `/tmp/patch-stephfanny-${Date.now()}.json`;
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
  console.log('\nPATCH OK -> updateTime:', parsed.updateTime);

  // Re-fetch + dump
  const after = fetchDoc();
  const outFile = '/Users/romanemarino/Coach-Running-IA/post-patch-stephfanny-plan.json';
  execSync(`cat > ${outFile} <<'JSON_EOF'\n${JSON.stringify(after, null, 2)}\nJSON_EOF`);
  console.log(`Dump post-patch -> ${outFile}`);

  // Confirmation lecture
  const fa = after.fields;
  console.log('\n--- POST-PATCH VERIF ---');
  console.log(`  feasibility.status        : ${fa.feasibility?.mapValue?.fields?.status?.stringValue}`);
  console.log(`  feasibility.score         : ${fa.feasibility?.mapValue?.fields?.score?.integerValue}`);
  console.log(`  confidenceScore           : ${fa.confidenceScore?.integerValue}`);
  console.log(`  paces.allureSpecifique10k : ${fa.paces?.mapValue?.fields?.allureSpecifique10k?.stringValue}`);
  console.log(`  welcomeMessage (60 chars) : ${fa.welcomeMessage?.stringValue?.slice(0,60)}...`);
  const aSessions = fa.weeks.arrayValue.values[0].mapValue.fields.sessions.arrayValue.values;
  for (const s of aSessions) {
    const sf = s.mapValue.fields;
    console.log(`  ${sf.day?.stringValue.padEnd(9)} | ${sf.duration?.stringValue.padEnd(6)} | ${(sf.distance?.stringValue||'').padEnd(8)} | mainSet="${(sf.mainSet?.stringValue||'').slice(0,80)}..."`);
  }
})().catch(e => { console.error('FATAL', e); process.exit(99); });
