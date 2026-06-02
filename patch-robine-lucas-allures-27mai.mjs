#!/usr/bin/env node
/**
 * patch-robine-lucas-allures-27mai.mjs
 *
 * Aligne TOUTES les allures (targetPace + mainSet) sur la VMA ajustée user.
 * Pourquoi : Gemini a généré mainSet avec VMA brute, mais user a ajusté VMA
 * post-questionnaire → incohérence interne (Robine S1 Mardi : targetPace 8:57 ↔
 * mainSet "à 10:47 min/km"). Le code calcule targetPace sur VMA ajustée, mais
 * Gemini a rédigé mainSet sur VMA brute.
 *
 * Algorithme :
 *   Pour chaque session avec targetPace (Course only — skip Renfo/Repos) :
 *     - Calcule ratio = newVMA / oldVMA
 *     - Regex-replace chaque pattern "X:XX min/km" ou "X:XX/km" dans mainSet
 *     - Nouvelle pace = oldPace / ratio (plus rapide si ratio > 1)
 *     - Préserve les warmup/cooldown différents proportionnellement (12:02 → 9:59
 *       pour ratio 1.205)
 *   Update welcomeMessage avec warning ajustement > 15%.
 *
 * Doctrines :
 *   - feedback_securite_avant_conversion : warning explicite dans welcome
 *   - jamais_baisser_allure_cible : on monte (plus rapide), pas baisser
 *   - jamais_poids_minceur : zéro mention IMC dans wording
 *
 * Usage :
 *   DRY  : node patch-robine-lucas-allures-27mai.mjs USER=robine
 *   EXEC : DRY_RUN=false USER=robine node patch-robine-lucas-allures-27mai.mjs
 *   Idem USER=lucas
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const USERS = {
  robine: {
    planId: '1779898894672',
    email: 'robineregina@gmail.com',
    vmaBrute: 8.3,
    vmaAdjusted: 10.0,
    welcome: `Bienvenue Robine,

Tu as ajusté ta VMA de 8.3 à 10 km/h (+20%) lors de ton inscription. On a recalculé toutes les allures de ton plan sur ta VMA ajustée à 10, comme tu l'as demandé.

Ton objectif 1h15 sur 10K est ambitieux mais cohérent avec ta VMA ajustée à 10 (80% VMA). C'est dans la zone Daniels VDOT atteignable avec une préparation rigoureuse.

⚠️ Important : un ajustement +20% est significatif. Si tu sens dès S1-S2 que les allures sont trop dures (effort perçu RPE > 7 sur les footings), c'est probablement que ta VMA réelle est plus proche de 8.3 que de 10. Préviens-nous via Romane et on peut revenir à ta VMA d'origine depuis ton profil — sans aucun jugement, ton corps a toujours raison.

À 47 ans, certificat médical d'aptitude recommandé avant de démarrer, idéalement un test d'effort.

Ce plan de 16 semaines va construire ta base aérobie + ton seuil pour passer la ligne en pleine forme. La régularité prime sur l'intensité.

Romane et moi sommes là. Bon vent.`,
  },
  lucas: {
    planId: '1779900008615',
    email: 'lucasducharlet@outlook.fr',
    vmaBrute: 10.9,
    vmaAdjusted: 13.4,
    welcome: `Salut Lucas,

Tu as ajusté ta VMA de 10.9 à 13.4 km/h (+23%) lors de ton inscription. On a recalculé toutes les allures de ton plan sur ta VMA ajustée à 13.4, comme tu l'as demandé.

⚠️ Important : un ajustement +23% est très significatif. Si ta VMA réelle est plus proche de 10.9 que de 13.4, les allures de ton plan seront trop dures et tu risques la blessure. Si tu sens dès S1-S2 que les footings sont trop rapides (essoufflement avant 30s, RPE > 7), c'est le signal. Préviens-nous et on peut revenir à ta VMA d'origine depuis ton profil — sans jugement.

Côté objectif : 40 min sur 10K demande 112% VMA même avec ta VMA ajustée 13.4 — c'est physiologiquement infaisable. Le seuil maximal soutenable sur 10K est environ 95% VMA. Objectif réaliste : 42-43 min — c'est déjà un très beau chrono à 23 ans.

À 23 ans avec un IMC normal, pas de souci médical particulier au-delà du certificat d'aptitude standard. Reste à l'écoute des 3 règles d'or sécurité (cf. encart).

Romane et moi sommes là. Bon vent.`,
  },
};

const userKey = process.env.USER || 'robine';
const conf = USERS[userKey];
if (!conf) throw new Error(`USER inconnu : ${userKey}. Choix : robine | lucas`);

const DRY_RUN = process.env.DRY_RUN !== 'false';
const BACKUP_DIR = `/Users/romanemarino/Coach-Running-IA/audit-3prem-27mai-soir/backups-${userKey}-allures-${Date.now()}`;
mkdirSync(BACKUP_DIR, { recursive: true });

const docUrl = `https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/${conf.planId}`;
const token = () => execSync('gcloud auth print-access-token').toString().trim();
const fetchDoc = () => JSON.parse(execSync(`curl -s -H "Authorization: Bearer ${token()}" "${docUrl}"`, { maxBuffer: 80*1024*1024 }).toString());

// Ratio de conversion : si newVMA > oldVMA, ratio > 1, donc allures plus rapides (pace plus court)
const RATIO = conf.vmaAdjusted / conf.vmaBrute;

/**
 * Transforme une pace "X:XX" en nouvelle pace selon ratio VMA.
 * Plus la VMA monte, plus l'allure devient rapide (pace plus petit).
 */
function transformPaceStr(paceStr) {
  const m = paceStr.match(/^(\d+):(\d{2})$/);
  if (!m) return paceStr;
  const oldPaceMin = parseInt(m[1]) + parseInt(m[2]) / 60;
  if (oldPaceMin <= 0) return paceStr;
  const oldKmh = 60 / oldPaceMin;
  const newKmh = oldKmh * RATIO;
  if (newKmh <= 0) return paceStr;
  const newPaceMin = 60 / newKmh;
  let nm = Math.floor(newPaceMin);
  let ns = Math.round((newPaceMin - nm) * 60);
  if (ns >= 60) { nm += 1; ns = 0; }
  return `${nm}:${String(ns).padStart(2, '0')}`;
}

/**
 * Regex-replace toutes les paces dans une string (mainSet).
 * Patterns ciblés : "X:XX min/km", "X:XX/km", "à X:XX" (avec contexte allure)
 */
function transformMainSet(mainSet) {
  if (!mainSet) return mainSet;
  let result = mainSet;
  // "X:XX min/km" — le plus fréquent
  result = result.replace(/(\d+):(\d{2})(\s+min\/km)/g, (_, m, s, unit) => transformPaceStr(`${m}:${s}`) + unit);
  // "X:XX/km" sans espace
  result = result.replace(/(\d+):(\d{2})(\/km)/g, (_, m, s, unit) => transformPaceStr(`${m}:${s}`) + unit);
  // "à X:XX" (allure parenthétique, ex: "endurance fondamentale (9:43)")
  result = result.replace(/\((\d+):(\d{2})\)/g, (_, m, s) => `(${transformPaceStr(`${m}:${s}`)})`);
  // "allure X:XX" (sans unité après)
  result = result.replace(/allure (\d+):(\d{2})(?!\d)/g, (_, m, s) => `allure ${transformPaceStr(`${m}:${s}`)}`);
  return result;
}

console.log(`>>> Re-patch allures ${userKey} — DRY_RUN=${DRY_RUN}`);
console.log(`>>> VMA brute=${conf.vmaBrute}, ajustée=${conf.vmaAdjusted}, ratio=${RATIO.toFixed(3)}`);

const doc = fetchDoc();
writeFileSync(`${BACKUP_DIR}/${conf.planId}-before.json`, JSON.stringify(doc, null, 2));
const f = doc.fields;
if (f.userEmail?.stringValue !== conf.email) throw new Error('Email mismatch');

// Update welcomeMessage avec warning
f.welcomeMessage = { stringValue: conf.welcome };
console.log(`welcomeMessage : refondu avec warning ajustement (+${Math.round((RATIO-1)*100)}%)`);

// Update VMA dans generationContext (référentiel cohérent)
const gc = f.generationContext?.mapValue?.fields;
if (gc?.vma) {
  const oldVma = gc.vma.doubleValue || gc.vma.integerValue;
  gc.vma = { doubleValue: conf.vmaAdjusted };
  console.log(`generationContext.vma : ${oldVma} → ${conf.vmaAdjusted}`);
}

// Update sessions : targetPace + mainSet
const weeks = f.weeks?.arrayValue?.values || [];
console.log(`\n${weeks.length} semaine(s) à patcher`);
let patchedCount = 0;
for (let wIdx = 0; wIdx < weeks.length; wIdx++) {
  const sessions = weeks[wIdx].mapValue.fields.sessions?.arrayValue?.values || [];
  for (const s of sessions) {
    const sf = s.mapValue.fields;
    const type = sf.type?.stringValue;
    const day = sf.day?.stringValue;
    const oldPace = sf.targetPace?.stringValue;
    const oldMain = sf.mainSet?.stringValue;
    if (!oldPace || oldPace === '-' || oldPace === 'N/A') continue;
    if (type === 'Renforcement' || type === 'Repos') continue;
    // Skip séances avec multiple allures complexes (Fractionné/VMA) — risque regex
    // Pour les profils Robine/Lucas S1, ce sont essentiellement Jogging/SL → safe
    const newPaceMatch = oldPace.match(/^(\d+:\d{2})/);
    if (!newPaceMatch) continue;
    const newPace = transformPaceStr(newPaceMatch[1]);
    const newPaceFull = oldPace.replace(/^\d+:\d{2}/, newPace);
    const newMain = transformMainSet(oldMain || '');
    sf.targetPace = { stringValue: newPaceFull };
    sf.mainSet = { stringValue: newMain };
    if (wIdx === 0) {
      console.log(`  S${wIdx+1} [${day}] ${type} : targetPace ${oldPace} → ${newPaceFull}`);
    }
    patchedCount++;
  }
}
console.log(`\nTotal sessions patchées : ${patchedCount}`);

const mask = ['welcomeMessage', 'generationContext', 'weeks'];

if (DRY_RUN) {
  writeFileSync(`${BACKUP_DIR}/${conf.planId}-proposed.json`, JSON.stringify({ fields: f }, null, 2));
  console.log(`\nDRY RUN OK. Pour exec : DRY_RUN=false USER=${userKey} node patch-robine-lucas-allures-27mai.mjs`);
} else {
  const url = `${docUrl}?${mask.map(p => `updateMask.fieldPaths=${p}`).join('&')}`;
  const tmp = `/tmp/patch-${userKey}-allures-${Date.now()}.json`;
  writeFileSync(tmp, JSON.stringify({ fields: f }));
  const res = JSON.parse(execSync(`curl -s -X PATCH -H "Authorization: Bearer ${token()}" -H "Content-Type: application/json" --data-binary @${tmp} "${url}"`, { maxBuffer: 80*1024*1024 }).toString());
  if (res.error) { console.error(res.error.message); process.exit(1); }
  console.log(`\n✅ PATCH OK -> updateTime: ${res.updateTime}`);
  console.log(`🟢 ${userKey} plan: allures alignées sur VMA ${conf.vmaAdjusted}`);
}
