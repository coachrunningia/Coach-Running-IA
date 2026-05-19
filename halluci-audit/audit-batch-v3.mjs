// Audit V3 : focus sur incohérences allure mainSet vs efPace (cas abalandreau type)
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
  if (v.stringValue) { const m = v.stringValue.match(/(\d+(?:[.,]\d+)?)/); return m ? parseFloat(m[1].replace(',', '.')) : null; }
  return null;
}
function maskEmail(e) {
  if (!e) return '???';
  const [u, d] = e.split('@');
  if (!u || !d) return '???';
  const half = Math.max(2, Math.floor(u.length / 2));
  return u.slice(0, Math.ceil(u.length / 2)) + '*'.repeat(half) + '@' + d;
}

function paceStrToSec(s) {
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
}

// Pattern G : EF déclarée dans mainSet avec allure ≠ efPace du plan
// "endurance fondamentale (EF) à X:YY min/km" et X:YY != efPace ±10s
const reEFinMainset = /endurance fondamentale\s*(?:\([^)]*\))?\s*(?:[àa]|-|:)?\s*(\d{1,2}):(\d{2})\s*min\/km/gi;
const reEFinMainset2 = /\(\s*ef\s*[-:à]?\s*(\d{1,2}):(\d{2})\s*min\/km\s*\)/gi;
const reEFinMainset3 = /\bef\b\s*\(\s*(\d{1,2}):(\d{2})\s*min\/km\)/gi;
const reEFinMainset4 = /allure\s+ef\s*\(?\s*(\d{1,2}):(\d{2})\s*min\/km/gi;
const reEFinMainset5 = /aisance\s+respiratoire\s*\(?\s*ef\s*\)?\s*(?:[àa]|-)?\s*(\d{1,2}):(\d{2})\s*min\/km/gi;
// Pattern H : "à allure EF" without numeric inside, then numeric mismatch hard to detect → skip

const alertsG = [];
let total = 0;

for (const fn of files) {
  const planId = fn.replace('.json', '');
  const doc = JSON.parse(fs.readFileSync(path.join(dir, fn), 'utf-8'));
  const f = doc.fields;
  const email = getStr(f, 'userEmail');
  const planName = getStr(f, 'name');
  const paces = f.paces?.mapValue?.fields || {};
  const efPaceStr = paces.efPace?.stringValue;
  if (!efPaceStr) continue;
  const efSec = paceStrToSec(efPaceStr);
  if (efSec == null) continue;

  const weeksArr = f.weeks?.arrayValue?.values || [];
  for (let wi = 0; wi < weeksArr.length; wi++) {
    const w = weeksArr[wi].mapValue?.fields || {};
    const weekNumber = getNum(w, 'weekNumber') ?? (wi + 1);
    const sessions = w.sessions?.arrayValue?.values || [];
    for (const s of sessions) {
      const sf = s.mapValue?.fields || {};
      const type = getStr(sf, 'type') || '';
      const mainSet = getStr(sf, 'mainSet') || '';
      if (!mainSet) continue;
      const lowerType = type.toLowerCase();
      if (lowerType.includes('renfo') || lowerType.includes('repos')) continue;
      total++;

      // chercher allure EF dans mainSet
      const found = [];
      let m;
      reEFinMainset.lastIndex = 0;
      while ((m = reEFinMainset.exec(mainSet)) !== null) {
        found.push({ str: `${m[1]}:${m[2]}`, sec: parseInt(m[1]) * 60 + parseInt(m[2]) });
      }
      for (const r of [reEFinMainset2, reEFinMainset3, reEFinMainset4, reEFinMainset5]) {
        r.lastIndex = 0;
        while ((m = r.exec(mainSet)) !== null) {
          found.push({ str: `${m[1]}:${m[2]}`, sec: parseInt(m[1]) * 60 + parseInt(m[2]) });
        }
      }
      for (const fnd of found) {
        const diff = Math.abs(fnd.sec - efSec);
        if (diff > 30) { // > 30 secondes d'écart à l'efPace plan
          alertsG.push({
            planId, email, weekNumber, type, mainSet,
            efPaceDeclared: efPaceStr, efPaceInMainset: fnd.str, diffSec: diff
          });
        }
      }
    }
  }
}

console.log("Pattern G (EF mainSet ≠ efPace plan, écart > 30s):", alertsG.length, "/", total, "séances");
for (const a of alertsG) {
  console.log(`${maskEmail(a.email)} S${a.weekNumber} ${a.type} | efPace plan:${a.efPaceDeclared} mainSet:${a.efPaceInMainset} (Δ${a.diffSec}s)`);
  console.log(`   mainSet: ${a.mainSet.slice(0, 160)}`);
}
fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/halluci-audit/alerts-G.json', JSON.stringify(alertsG, null, 2));
