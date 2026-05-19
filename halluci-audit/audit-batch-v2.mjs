import fs from 'fs';
import path from 'path';

const dir = '/Users/romanemarino/Coach-Running-IA/halluci-audit/plans';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

function getStr(f, key) { return f?.[key]?.stringValue; }
function getNum(f, key) {
  const v = f?.[key];
  if (!v) return null;
  if (v.integerValue != null) return Number(v.integerValue);
  if (v.doubleValue != null) return Number(v.doubleValue);
  if (v.stringValue) {
    const m = v.stringValue.match(/(\d+(?:[.,]\d+)?)/);
    return m ? parseFloat(m[1].replace(',', '.')) : null;
  }
  return null;
}
function maskEmail(e) {
  if (!e) return '???';
  const [u, d] = e.split('@');
  if (!u || !d) return '???';
  const half = Math.max(2, Math.floor(u.length / 2));
  return u.slice(0, Math.ceil(u.length / 2)) + '*'.repeat(half) + '@' + d;
}

// Patterns plus larges
// A: "N <séparateur> Xkm" où séparateur = blocs/x/×/fois/répétitions/répèts/reps/portions/intervalles
const reA = /(\d+)\s*(?:blocs?|x|×|fois|rép(?:étitions?)?|reps?|portions?|intervalles?)\s*(?:de\s+)?(\d+(?:[.,]\d+)?)\s*km\b/gi;
// C: tu vas faire/parcourir/courir Xkm
const reC = /(?:parcourir|parcours|tu vas faire|tu fais|courir|effectue|effectuer|cours|réalise|réaliser)\s+(?:environ\s+)?(\d+(?:[.,]\d+)?)\s*km/gi;
// D: référence séance précédente
const reD = /comme\s+(dimanche|samedi|vendredi|jeudi|mercredi|mardi|lundi|hier|la semaine\s+dernière|précédent|passé)\s+dernier?/gi;
// E: type "Sortie Longue" mainSet contient "fartlek", "fractionné" (mots vraiment incompatibles)
const reEStrong = /\b(fartlek|fractionné|fractionne)\b/gi;
// Allure : extract "X:YY min/km"
const rePace = /(\d{1,2}):(\d{2})\s*min\/km/gi;

function paceToSec(s) {
  const [mm, ss] = s.split(':');
  return parseInt(mm) * 60 + parseInt(ss);
}

const alerts = { A: [], C: [], D: [], E: [], F: [] };
let totalSessions = 0;
let totalRunningSessions = 0;
const planSummary = [];

for (const fn of files) {
  const planId = fn.replace('.json', '');
  const doc = JSON.parse(fs.readFileSync(path.join(dir, fn), 'utf-8'));
  const f = doc.fields;
  const email = getStr(f, 'userEmail');
  const planName = getStr(f, 'name');
  const weeksArr = f.weeks?.arrayValue?.values || [];
  let planAlerts = 0;
  let sessionsInPlan = 0;

  for (let wi = 0; wi < weeksArr.length; wi++) {
    const w = weeksArr[wi].mapValue?.fields || {};
    const weekNumber = getNum(w, 'weekNumber') ?? (wi + 1);
    const sessions = w.sessions?.arrayValue?.values || [];
    for (let si = 0; si < sessions.length; si++) {
      const s = sessions[si].mapValue?.fields || {};
      const type = getStr(s, 'type') || '';
      const distance = getNum(s, 'distance');
      const mainSet = getStr(s, 'mainSet') || '';
      const targetPace = getStr(s, 'targetPace') || '';
      const title = getStr(s, 'title') || '';
      const day = getStr(s, 'day') || '';
      sessionsInPlan++;
      totalSessions++;

      if (!mainSet) continue;
      const lowerType = type.toLowerCase();
      const isRenfo = lowerType.includes('renfo') || lowerType.includes('renforce');
      const isRepos = lowerType.includes('repos');
      if (isRenfo || isRepos) continue;
      totalRunningSessions++;

      // Pattern A
      reA.lastIndex = 0;
      let m;
      while ((m = reA.exec(mainSet)) !== null) {
        const N = parseInt(m[1]);
        const X = parseFloat(m[2].replace(',', '.'));
        if (!N || !X || distance == null) continue;
        const total = N * X;
        let verdict = null;
        // Plus strict : N >= 1 et X >= distance (un bloc unique faisant toute la séance OU plus)
        if (N >= 1 && X >= distance && X >= 5) verdict = 'BLOCK>=DIST';
        else if (total > distance * 1.1 && total >= distance + 2) verdict = 'TOTAL>DIST';
        if (verdict) {
          alerts.A.push({
            planId, email, weekNumber, type, distance, mainSet,
            match: m[0], N, X, total, verdict
          });
          planAlerts++;
        }
      }

      // Pattern C
      reC.lastIndex = 0;
      while ((m = reC.exec(mainSet)) !== null) {
        const X = parseFloat(m[1].replace(',', '.'));
        if (!X || distance == null) continue;
        const diff = Math.abs(X - distance) / distance;
        if (diff > 0.25 && X !== distance && X >= 5) {
          alerts.C.push({
            planId, email, weekNumber, type, distance, mainSet,
            match: m[0], extracted: X, diff: Math.round(diff * 100) + '%'
          });
          planAlerts++;
        }
      }

      // Pattern D
      reD.lastIndex = 0;
      while ((m = reD.exec(mainSet)) !== null) {
        alerts.D.push({
          planId, email, weekNumber, type, distance, mainSet,
          match: m[0]
        });
        planAlerts++;
      }

      // Pattern E : SL/Footing avec mots fartlek/fractionné (strict)
      if (lowerType.includes('sortie longue') || lowerType.includes('jogging') || lowerType.includes('footing') || lowerType.includes('endurance')) {
        reEStrong.lastIndex = 0;
        const matches = mainSet.match(reEStrong);
        if (matches) {
          alerts.E.push({
            planId, email, weekNumber, type, distance, mainSet,
            matches: matches.join(', ')
          });
          planAlerts++;
        }
      }

      // Pattern F : allure mainSet incohérente avec targetPace
      // Extraire allures du mainSet et comparer avec targetPace
      if (targetPace && targetPace.match(/\d+:\d{2}/)) {
        const tp = targetPace.match(/(\d{1,2}):(\d{2})/);
        if (tp) {
          const tpSec = parseInt(tp[1]) * 60 + parseInt(tp[2]);
          rePace.lastIndex = 0;
          const allPaces = [];
          let mp;
          while ((mp = rePace.exec(mainSet)) !== null) {
            allPaces.push({ str: mp[0], sec: parseInt(mp[1]) * 60 + parseInt(mp[2]) });
          }
          // si target est "marathon 4:44" et mainSet contient "4:44 min/km", c'est cohérent
          // alerte uniquement si l'allure principale du mainSet (la plus rapide ou la plus longue durée) est différente
          // version simple : si AUCUNE allure mainSet ne matche targetPace ±15s ET il y a au moins une allure, et type n'est pas mixte
          if (allPaces.length > 0) {
            const matchesTP = allPaces.some(p => Math.abs(p.sec - tpSec) <= 15);
            // skip pour les types mixtes (SL, fractionné peut avoir plusieurs allures)
            const isMixed = lowerType.includes('sortie longue') || lowerType.includes('fractionné') || lowerType.includes('fartlek');
            if (!matchesTP && !isMixed) {
              alerts.F.push({
                planId, email, weekNumber, type, distance, mainSet,
                targetPace, mainSetPaces: allPaces.map(p => p.str).join(' / ')
              });
              planAlerts++;
            }
          }
        }
      }
    }
  }

  planSummary.push({ planId, email, planName, sessionsInPlan, planAlerts });
}

fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/halluci-audit/alerts-v2.json', JSON.stringify({
  totals: {
    plansAudited: files.length,
    totalSessions,
    totalRunningSessions,
    alertA: alerts.A.length,
    alertC: alerts.C.length,
    alertD: alerts.D.length,
    alertE: alerts.E.length,
    alertF: alerts.F.length
  },
  planSummary,
  alerts
}, null, 2));

console.log("=== AUDIT BATCH v2 ===");
console.log("Plans audités:", files.length);
console.log("Séances totales:", totalSessions);
console.log("Séances course-pertinentes:", totalRunningSessions);
console.log("Pattern A (blocs/x/rép Xkm):", alerts.A.length);
console.log("Pattern C (parcourir Xkm != distance):", alerts.C.length);
console.log("Pattern D (référence séance précédente):", alerts.D.length);
console.log("Pattern E (type SL/footing avec fartlek/fractionné):", alerts.E.length);
console.log("Pattern F (allure mainSet != targetPace):", alerts.F.length);

console.log("\n--- ALL PATTERN A ---");
for (const a of alerts.A) {
  console.log(`[${a.verdict}] ${maskEmail(a.email)} S${a.weekNumber} ${a.type} ${a.distance}km - "${a.match}" → ${a.N}×${a.X}=${a.total}km`);
  console.log(`   mainSet: ${a.mainSet.slice(0, 150)}`);
}

console.log("\n--- ALL PATTERN C ---");
for (const a of alerts.C) {
  console.log(`${maskEmail(a.email)} S${a.weekNumber} ${a.type} ${a.distance}km - "${a.match}" (écart ${a.diff})`);
  console.log(`   mainSet: ${a.mainSet.slice(0, 150)}`);
}

console.log("\n--- ALL PATTERN D ---");
for (const a of alerts.D) {
  console.log(`${maskEmail(a.email)} S${a.weekNumber} ${a.type} - "${a.match}"`);
}

console.log("\n--- ALL PATTERN E ---");
for (const a of alerts.E) {
  console.log(`${maskEmail(a.email)} S${a.weekNumber} ${a.type} - matches: ${a.matches}`);
  console.log(`   mainSet: ${a.mainSet.slice(0, 150)}`);
}

console.log("\n--- ALL PATTERN F (top 20) ---");
for (const a of alerts.F.slice(0, 20)) {
  console.log(`${maskEmail(a.email)} S${a.weekNumber} ${a.type} ${a.distance}km - target:${a.targetPace} - mainSet:${a.mainSetPaces}`);
  console.log(`   mainSet: ${a.mainSet.slice(0, 150)}`);
}
