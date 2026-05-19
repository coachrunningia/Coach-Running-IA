// Audit V4 : durée mainSet vs duration session
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
function getDurationMin(f, key) {
  // "63 min" ou "1h42" ou "35-45 min"
  const v = f?.[key];
  if (!v?.stringValue) return null;
  const s = v.stringValue;
  // 1h42
  const mH = s.match(/(\d+)h\s*(\d+)?/);
  if (mH) {
    return parseInt(mH[1]) * 60 + (mH[2] ? parseInt(mH[2]) : 0);
  }
  const mM = s.match(/(\d+)\s*min/);
  if (mM) return parseInt(mM[1]);
  return null;
}
function maskEmail(e) {
  if (!e) return '???';
  const [u, d] = e.split('@');
  if (!u || !d) return '???';
  return u.slice(0, Math.ceil(u.length / 2)) + '*'.repeat(Math.max(2, Math.floor(u.length / 2))) + '@' + d;
}

// Extraire la durée totale mentionnée dans le mainSet (somme grossière des minutes/heures)
// Format dominant : "1h00", "1h45", "37 min", "X min"
const reHM = /(\d+)\s*h\s*(\d+)?\s*(?:min)?/gi;
const reMin = /(\d+)\s*min/gi;

function extractMainsetMinutes(mainSet) {
  // chercher la grande durée (le premier match heure ou min)
  let max = 0;
  reHM.lastIndex = 0;
  let m;
  while ((m = reHM.exec(mainSet)) !== null) {
    const minutes = parseInt(m[1]) * 60 + (m[2] ? parseInt(m[2]) : 0);
    if (minutes > max && minutes >= 30) max = minutes;
  }
  if (max > 0) return max;
  reMin.lastIndex = 0;
  while ((m = reMin.exec(mainSet)) !== null) {
    const minutes = parseInt(m[1]);
    if (minutes > max && minutes >= 20) max = minutes;
  }
  return max || null;
}

const alertsDur = [];
let total = 0;
for (const fn of files) {
  const planId = fn.replace('.json', '');
  const doc = JSON.parse(fs.readFileSync(path.join(dir, fn), 'utf-8'));
  const f = doc.fields;
  const email = getStr(f, 'userEmail');
  const weeksArr = f.weeks?.arrayValue?.values || [];
  for (let wi = 0; wi < weeksArr.length; wi++) {
    const w = weeksArr[wi].mapValue?.fields || {};
    const weekNumber = getNum(w, 'weekNumber') ?? (wi + 1);
    const sessions = w.sessions?.arrayValue?.values || [];
    for (const s of sessions) {
      const sf = s.mapValue?.fields || {};
      const type = getStr(sf, 'type') || '';
      const lowerType = type.toLowerCase();
      if (lowerType.includes('renfo') || lowerType.includes('repos')) continue;
      const mainSet = getStr(sf, 'mainSet') || '';
      if (!mainSet) continue;
      const duration = getDurationMin(sf, 'duration');
      if (!duration) continue;
      total++;
      const msMinutes = extractMainsetMinutes(mainSet);
      if (msMinutes == null) continue;
      // Comparer : si écart > 30 min ou > 50% → suspect
      const diff = Math.abs(msMinutes - duration);
      if (diff > 30 && diff > duration * 0.5) {
        alertsDur.push({
          planId, email, weekNumber, type,
          duration, msMinutes, diff,
          mainSet: mainSet.slice(0, 180)
        });
      }
    }
  }
}
console.log("Pattern H (durée mainSet ≠ duration session, écart > 30min ET > 50%):", alertsDur.length, "/", total);
for (const a of alertsDur) {
  console.log(`${maskEmail(a.email)} S${a.weekNumber} ${a.type} | duration:${a.duration}min mainSet:${a.msMinutes}min (Δ${a.diff})`);
  console.log(`   ${a.mainSet}`);
}
