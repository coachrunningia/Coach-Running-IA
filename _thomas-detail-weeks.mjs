import { readFileSync } from 'fs';
const plan = JSON.parse(readFileSync('/Users/romanemarino/Coach-Running-IA/audit-thomas-plan-parsed.json'));
const weeks = plan.weeks || [];

const kmOf = (s) => parseFloat(String(s.distance || '0').replace(/[^0-9.]/g, '')) || 0;
const durMin = (d) => { let s = 0; const dStr = String(d||''); const h = dStr.match(/(\d+)\s*h\s*(\d*)/); if (h) { s += parseInt(h[1])*60; if (h[2]) s += parseInt(h[2]); } const m = dStr.match(/^(\d+)\s*min/); if (m) s = parseInt(m[1]); return s; };
const paceSec = (p) => { const m = String(p||'').match(/(\d+):(\d+)/); return m ? parseInt(m[1])*60 + parseInt(m[2]) : null; };

// Pour chaque semaine, lister titre + type + distance + duration + pace + mainSet abrégé
for (let i = 0; i < weeks.length; i++) {
  const w = weeks[i];
  console.log(`\n=== S${i+1} (${w.phase}) ===`);
  for (const s of (w.sessions || [])) {
    const km = kmOf(s);
    const d = durMin(s.duration);
    const ps = paceSec(s.pace || s.targetPace);
    let calcPace = '';
    if (km > 0 && d > 0) {
      const secPerKm = (d * 60) / km;
      const cp = `${Math.floor(secPerKm/60)}:${String(Math.round(secPerKm%60)).padStart(2,'0')}`;
      calcPace = ` [calc:${cp}/km]`;
    }
    console.log(`  ${s.day} | ${s.type} | "${s.title}" | ${s.distance || '-'} | ${s.duration || '-'} | pace:${s.targetPace || s.pace || '-'}${calcPace}`);
    const ms = (s.mainSet || '').replace(/\n/g, ' ').slice(0, 200);
    console.log(`    mainSet: ${ms}`);
  }
}
