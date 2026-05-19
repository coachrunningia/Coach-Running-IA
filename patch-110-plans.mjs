/**
 * PATCH BATCH — 110 plans affectés par le bug pace asymétrique
 *
 * Mode dry-run par défaut. Pour exécuter réellement : node patch-110-plans.mjs --exec
 *
 * Pour chaque plan :
 *   1. paces.allureSpecifique[X] : potentiel VMA → cible chrono
 *   2. feasibility.status : recalculé selon nouveau %VMA cible
 *   3. feasibility.score : recalculé
 *   4. confidenceScore : recalculé (synchro)
 *   5. (si fullPlanGenerated) : chaque session.targetPace = pace stockée → pace cible
 *
 * Backup individuel par plan dans backups-110/{planId}.json
 * Log détaillé dans patch-110-log.json
 */
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';

const DRY_RUN = !process.argv.includes('--exec');
const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const H = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };

if (!existsSync('backups-110')) mkdirSync('backups-110');

// Exclusions : plans déjà patchés manuellement (à NE PAS écraser).
// 1778927329896 : al1.kasongo Marathon 3h30, patché manuellement à AMBITIEUX/65
//   le 17/05/2026. Le calcul auto recommande BON/75 mais on préserve le choix
//   manuel plus conservateur.
const EXCLUDE_IDS = new Set(['1778927329896']);

const detailedAll = JSON.parse(readFileSync('audit-pace-bug-v2.json', 'utf8'));
const detailed = detailedAll.filter(d => !EXCLUDE_IDS.has(d.id));
const excluded = detailedAll.filter(d => EXCLUDE_IDS.has(d.id));
console.log(`${DRY_RUN ? '🧪 DRY-RUN' : '🚀 EXEC'} sur ${detailed.length} plans (${excluded.length} exclus: ${[...EXCLUDE_IDS].join(', ')})\n`);

// Helpers communs (dupliqués depuis audit-pace-bug-v2.mjs)
function timeToSeconds(timeStr, distance) {
  if (!timeStr) return 0;
  const s = String(timeStr).trim().toLowerCase();
  const hm = s.match(/(\d+)\s*h\s*(\d{0,2})/);
  if (hm) return parseInt(hm[1]) * 3600 + (hm[2] ? parseInt(hm[2]) * 60 : 0);
  const hms = s.match(/(\d+):(\d{1,2}):(\d{1,2})/);
  if (hms) return parseInt(hms[1])*3600 + parseInt(hms[2])*60 + parseInt(hms[3]);
  const ms = s.match(/^(\d+):(\d{1,2})$/);
  if (ms) { if (distance >= 21) return parseInt(ms[1])*3600 + parseInt(ms[2])*60; return parseInt(ms[1])*60 + parseInt(ms[2]); }
  return 0;
}
const paceToSec = (p)=>{ if(!p) return null; const m=String(p).match(/(\d+)\s*[:'’]\s*(\d+)/); return m?parseInt(m[1])*60+parseInt(m[2]):null; };
function secondsToPace(s) { if (!s || s <= 0) return '0:00'; const m = Math.floor(s/60), sec = Math.round(s%60); return `${m}:${String(sec).padStart(2,'0')}`; }

const raceMap = {
  '5 km':         { dist: 5,      paceKey: 'allureSpecifique5k' },
  '10 km':        { dist: 10,     paceKey: 'allureSpecifique10k' },
  'semi-marathon':{ dist: 21.097, paceKey: 'allureSpecifiqueSemi' },
  'marathon':     { dist: 42.195, paceKey: 'allureSpecifiqueMarathon' },
};

const log = [];
let nbOk = 0, nbErr = 0, nbSessionsTouched = 0;

for (const d of detailed) {
  try {
    // 1. Fetch + backup
    const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${d.id}`, { headers:H });
    const doc = await r.json();
    if (!doc.fields) { console.log(`⚠ ${d.id} introuvable`); nbErr++; continue; }
    writeFileSync(`backups-110/${d.id}.json`, JSON.stringify(doc, null, 2));

    const subGoal = d.subGoal;
    const normalized = subGoal.toLowerCase().replace(/\s+/g, ' ').trim();
    const info = raceMap[normalized];
    if (!info) { console.log(`⚠ ${d.id} subGoal "${subGoal}" inconnu`); nbErr++; continue; }

    const targetSec = timeToSeconds(d.targetTime, info.dist);
    const targetPaceSec = targetSec / info.dist;
    const newPaceStr = secondsToPace(targetPaceSec);
    const oldPaceStr = doc.fields.paces?.mapValue?.fields?.[info.paceKey]?.stringValue;
    const oldPaceSec = paceToSec(oldPaceStr);

    // 2. Préparer nouveau paces (clone + update)
    const oldPacesFields = doc.fields.paces?.mapValue?.fields || {};
    const newPacesFields = { ...oldPacesFields, [info.paceKey]: { stringValue: newPaceStr } };

    // 3. Préparer nouveau feasibility
    const oldFeasFields = doc.fields.feasibility?.mapValue?.fields || {};
    const newFeasFields = {
      ...oldFeasFields,
      status: { stringValue: d.feasStatusReco },
      score: { integerValue: String(d.feasScoreReco) },
    };

    // 4. Préparer updateMask + body
    const updateMaskFields = ['paces', 'feasibility', 'confidenceScore'];
    const bodyFields = {
      paces: { mapValue: { fields: newPacesFields } },
      feasibility: { mapValue: { fields: newFeasFields } },
      confidenceScore: { integerValue: String(d.feasScoreReco) },
    };

    // 5. Si fullPlanGenerated : patch session.targetPace concernées
    let sessionsToFix = [];
    if (d.fullPlanGenerated && doc.fields.weeks?.arrayValue?.values && oldPaceSec) {
      // Cloner weeks structure et remplacer targetPace là où ça match
      const newWeeks = [];
      let sessionsFixed = 0;
      for (const wVal of doc.fields.weeks.arrayValue.values) {
        const wFields = wVal.mapValue.fields;
        const sessionsVal = wFields.sessions?.arrayValue?.values || [];
        const newSessions = [];
        for (const sVal of sessionsVal) {
          const sFields = { ...sVal.mapValue.fields };
          const tp = sFields.targetPace?.stringValue;
          if (tp) {
            const sec = paceToSec(tp);
            if (sec && Math.abs(sec - oldPaceSec) <= 5) {
              // Remplace : préserver le contexte autour (ex: "5:12 min/km" → "4:59 min/km")
              const newTp = tp.replace(/\d+[:'’]\d+/, newPaceStr);
              sFields.targetPace = { stringValue: newTp };
              sessionsFixed++;
              sessionsToFix.push({ week: wFields.weekNumber?.integerValue, title: sFields.title?.stringValue, oldTp: tp, newTp });
            }
          }
          newSessions.push({ mapValue: { fields: sFields } });
        }
        const newWFields = { ...wFields, sessions: { arrayValue: { values: newSessions } } };
        newWeeks.push({ mapValue: { fields: newWFields } });
      }
      if (sessionsFixed > 0) {
        updateMaskFields.push('weeks');
        bodyFields.weeks = { arrayValue: { values: newWeeks } };
        nbSessionsTouched += sessionsFixed;
      }
    }

    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${d.id}?` + updateMaskFields.map(f => `updateMask.fieldPaths=${f}`).join('&');

    log.push({
      id: d.id, email: d.email, subGoal, targetTime: d.targetTime,
      paceFrom: oldPaceStr, paceTo: newPaceStr,
      feasFrom: `${d.feasStatusActuel}/${d.feasScoreActuel}`,
      feasTo: `${d.feasStatusReco}/${d.feasScoreReco}`,
      fullPlanGenerated: d.fullPlanGenerated,
      sessionsToFix: sessionsToFix.length,
    });

    if (DRY_RUN) {
      // Pas de PATCH
    } else {
      const patch = await fetch(url, { method:'PATCH', headers:H, body: JSON.stringify({ fields: bodyFields }) });
      if (patch.status !== 200) {
        const pj = await patch.json();
        console.log(`❌ ${d.id} patch failed (${patch.status}): ${JSON.stringify(pj).substring(0,200)}`);
        nbErr++;
        continue;
      }
    }
    nbOk++;
    if (nbOk % 20 === 0) console.log(`  … ${nbOk}/${detailed.length}`);
  } catch (e) {
    console.log(`❌ ${d.id} exception: ${e.message}`);
    nbErr++;
  }
}

console.log(`\n══════════════════════════════════════════════════════════════════════════════════════════════`);
console.log(`  ${DRY_RUN ? '🧪 DRY-RUN' : '🚀 EXEC'} TERMINÉ`);
console.log(`══════════════════════════════════════════════════════════════════════════════════════════════`);
console.log(`  Plans OK         : ${nbOk}/${detailed.length}`);
console.log(`  Plans en erreur  : ${nbErr}`);
console.log(`  Sessions patched : ${nbSessionsTouched} (sur les ${detailed.filter(d => d.fullPlanGenerated).length} full plans)`);

writeFileSync('patch-110-log.json', JSON.stringify({ dryRun: DRY_RUN, executedAt: new Date().toISOString(), nbOk, nbErr, nbSessionsTouched, log }, null, 2));
console.log(`\n📝 patch-110-log.json (log détaillé)`);
console.log(`📦 backups-110/ (${nbOk} backups)`);

if (DRY_RUN) {
  console.log(`\n💡 Pour exécuter réellement : node patch-110-plans.mjs --exec`);
}
