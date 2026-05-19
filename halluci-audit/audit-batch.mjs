import fs from 'fs';
import path from 'path';

const dir = '/Users/romanemarino/Coach-Running-IA/halluci-audit/plans';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

// Helpers
function getStr(f, key) { return f?.[key]?.stringValue; }
function getNum(f, key) {
  const v = f?.[key];
  if (!v) return null;
  if (v.integerValue != null) return Number(v.integerValue);
  if (v.doubleValue != null) return Number(v.doubleValue);
  // distance/duration souvent stringValue type "12 km"
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

// Patterns regex
const reA = /(\d+)\s*(?:blocs?|x|×|fois)\s*(?:de\s+)?(\d+(?:[.,]\d+)?)\s*km/gi;
const reB = /(\d+)\s*(?:rép(?:étitions?)?|reps?)\s*(?:de\s+)?(\d+(?:[.,]\d+)?)\s*km/gi;
const reC = /(?:parcourir|parcours|tu vas faire|tu fais|courir|effectue|effectuer)\s+(?:environ\s+)?(\d+(?:[.,]\d+)?)\s*km/gi;
const reD = /comme\s+(dimanche|samedi|vendredi|jeudi|mercredi|mardi|lundi|hier|la semaine\s+dernière|précédent|passé)/gi;
const fartlekTypes = /\b(fartlek|fractionné|fractionné court|fractionné long|côtes|cotes|vma|fractionne|seuil|tempo|tempo run)\b/gi;

const alerts = { A: [], B: [], C: [], D: [], E: [] };
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
  const allSessionsByWeek = []; // pour pattern D

  for (let wi = 0; wi < weeksArr.length; wi++) {
    const w = weeksArr[wi].mapValue?.fields || {};
    const weekNumber = getNum(w, 'weekNumber') ?? (wi + 1);
    const sessions = w.sessions?.arrayValue?.values || [];
    const weekSessions = [];
    for (let si = 0; si < sessions.length; si++) {
      const s = sessions[si].mapValue?.fields || {};
      const type = getStr(s, 'type') || '';
      const distance = getNum(s, 'distance');
      const duration = getNum(s, 'duration');
      const mainSet = getStr(s, 'mainSet') || '';
      const targetPace = getStr(s, 'targetPace') || '';
      const title = getStr(s, 'title') || '';
      const day = getStr(s, 'day') || '';
      weekSessions.push({ type, distance, duration, mainSet, targetPace, title, day });
      sessionsInPlan++;
      totalSessions++;

      // Filtre : on n'audite que les séances avec mainSet
      if (!mainSet) continue;
      const lowerType = type.toLowerCase();
      const isRenfo = lowerType.includes('renfo') || lowerType.includes('renforce');
      const isRepos = lowerType.includes('repos');
      if (isRenfo || isRepos) continue; // pas pertinent
      totalRunningSessions++;

      // Pattern A : "N blocs/x/fois de Xkm"
      reA.lastIndex = 0;
      let m;
      while ((m = reA.exec(mainSet)) !== null) {
        const N = parseInt(m[1]);
        const X = parseFloat(m[2].replace(',', '.'));
        if (!N || !X) continue;
        if (distance == null) continue;
        const total = N * X;
        // ALERTE si Total > 110% distance ou si X >= distance (cas Thomas)
        let verdict = null;
        if (X >= distance) verdict = 'THOMAS-LIKE';
        else if (total > distance * 1.1) verdict = 'TOTAL>DIST';
        if (verdict) {
          alerts.A.push({
            planId, email, weekNumber, type, distance, mainSet,
            match: m[0], N, X, total, verdict
          });
          planAlerts++;
        }
      }

      // Pattern B : "Y reps de Zkm"
      reB.lastIndex = 0;
      while ((m = reB.exec(mainSet)) !== null) {
        const Y = parseInt(m[1]);
        const Z = parseFloat(m[2].replace(',', '.'));
        if (!Y || !Z || distance == null) continue;
        if (Y * Z > distance * 1.5) {
          alerts.B.push({
            planId, email, weekNumber, type, distance, mainSet,
            match: m[0], Y, Z, total: Y * Z
          });
          planAlerts++;
        }
      }

      // Pattern C : "parcourir Xkm" différent session.distance
      reC.lastIndex = 0;
      while ((m = reC.exec(mainSet)) !== null) {
        const X = parseFloat(m[1].replace(',', '.'));
        if (!X || distance == null) continue;
        const diff = Math.abs(X - distance) / distance;
        if (diff > 0.2 && X !== distance) {
          alerts.C.push({
            planId, email, weekNumber, type, distance, mainSet,
            match: m[0], extracted: X, diff: Math.round(diff * 100) + '%'
          });
          planAlerts++;
        }
      }

      // Pattern D : référence séance précédente
      reD.lastIndex = 0;
      while ((m = reD.exec(mainSet)) !== null) {
        alerts.D.push({
          planId, email, weekNumber, type, distance, mainSet,
          match: m[0]
        });
        planAlerts++;
      }

      // Pattern E : type session ≠ type mainSet
      if (lowerType.includes('sortie longue') || lowerType.includes('jogging') || lowerType.includes('footing') || lowerType.includes('endurance')) {
        fartlekTypes.lastIndex = 0;
        const ms = mainSet.toLowerCase();
        // Mais : "allure marathon" ou "à l'allure" pas un fartlek. Cherchons spécifiquement les mots-types.
        const matches = ms.match(fartlekTypes);
        if (matches) {
          // filtrer : "seuil/tempo" peut apparaître légitimement dans une SL (blocs au seuil). Vérifier si c'est massif.
          // On rapporte quand même pour analyse manuelle.
          alerts.E.push({
            planId, email, weekNumber, type, distance, mainSet,
            matches: matches.join(', ')
          });
          planAlerts++;
        }
      }
    }
    allSessionsByWeek.push({ weekNumber, sessions: weekSessions });
  }

  planSummary.push({ planId, email, planName, sessionsInPlan, planAlerts });
}

// Sauvegarder résultats
fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/halluci-audit/alerts.json', JSON.stringify({
  totals: {
    plansAudited: files.length,
    totalSessions,
    totalRunningSessions,
    alertA: alerts.A.length,
    alertB: alerts.B.length,
    alertC: alerts.C.length,
    alertD: alerts.D.length,
    alertE: alerts.E.length
  },
  planSummary,
  alerts
}, null, 2));

// Print synthèse
console.log("=== AUDIT BATCH ===");
console.log("Plans audités:", files.length);
console.log("Séances totales:", totalSessions);
console.log("Séances course-pertinentes:", totalRunningSessions);
console.log("Pattern A (N blocs/x de Xkm anormal):", alerts.A.length);
console.log("Pattern B (Y reps de Zkm anormal):", alerts.B.length);
console.log("Pattern C (parcourir Xkm != distance):", alerts.C.length);
console.log("Pattern D (référence séance précédente):", alerts.D.length);
console.log("Pattern E (type SL/footing avec mots fartlek):", alerts.E.length);

console.log("\n--- TOP 10 PATTERN A ---");
for (const a of alerts.A.slice(0, 20)) {
  console.log(`[${a.verdict}] ${maskEmail(a.email)} S${a.weekNumber} ${a.type} ${a.distance}km - "${a.match}" → ${a.N}×${a.X}=${a.total}km`);
  console.log(`   mainSet: ${a.mainSet.slice(0, 130)}`);
}

console.log("\n--- ALL PATTERN B ---");
for (const a of alerts.B) {
  console.log(`${maskEmail(a.email)} S${a.weekNumber} ${a.type} ${a.distance}km - "${a.match}" → ${a.Y}×${a.Z}=${a.total}km`);
}

console.log("\n--- ALL PATTERN C (top 15) ---");
for (const a of alerts.C.slice(0, 15)) {
  console.log(`${maskEmail(a.email)} S${a.weekNumber} ${a.type} ${a.distance}km - "${a.match}" (${a.diff})`);
}

console.log("\n--- ALL PATTERN D (top 10) ---");
for (const a of alerts.D.slice(0, 10)) {
  console.log(`${maskEmail(a.email)} S${a.weekNumber} ${a.type} - "${a.match}"`);
}

console.log("\n--- ALL PATTERN E (top 20) ---");
for (const a of alerts.E.slice(0, 20)) {
  console.log(`${maskEmail(a.email)} S${a.weekNumber} ${a.type} - matches: ${a.matches}`);
  console.log(`   mainSet: ${a.mainSet.slice(0, 130)}`);
}
